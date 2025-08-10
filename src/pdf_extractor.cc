// N-API
#include <napi.h>

// Windows UTF-16 -> UTF-8
#include <string>
#include <algorithm>
#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#else
#include <iconv.h>
#endif

// PDFium
#include "fpdfview.h"
#include "fpdf_text.h"
#include "fpdf_doc.h"

namespace {
  struct PdfiumInitGuard {
    PdfiumInitGuard() { FPDF_InitLibrary(); }
    ~PdfiumInitGuard() { FPDF_DestroyLibrary(); }
  } pdfiumGuard;
}

static std::string Utf16LeToUtf8(const std::u16string& text) {
  if (text.empty()) return std::string();
#ifdef _WIN32
  const wchar_t* widePtr = reinterpret_cast<const wchar_t*>(text.c_str());
  int needed = WideCharToMultiByte(CP_UTF8, 0, widePtr, -1, nullptr, 0, nullptr, nullptr);
  if (needed <= 0) return std::string();
  std::string tmp(static_cast<size_t>(needed - 1), '\0');
  WideCharToMultiByte(CP_UTF8, 0, widePtr, -1, tmp.data(), needed, nullptr, nullptr);
  return tmp;
#else
  // Converter UTF-16LE para UTF-8 usando iconv em plataformas POSIX
  if (text.empty()) return std::string();
  iconv_t cd = iconv_open("UTF-8", "UTF-16LE");
  if (cd == (iconv_t)-1) return std::string();

  const char* inbuf = reinterpret_cast<const char*>(text.data());
  size_t inbytesleft = text.size() * sizeof(char16_t);
  size_t outbytesleft = inbytesleft * 2 + 4; // buffer maior o suficiente
  std::string out(outbytesleft, '\0');
  char* outptr = out.data();

  size_t res = iconv(cd, const_cast<char**>(&inbuf), &inbytesleft, &outptr, &outbytesleft);
  iconv_close(cd);
  if (res == (size_t)-1) return std::string();
  out.resize(out.size() - outbytesleft);
  return out;
#endif
}

static std::string ReadMetaTextAsUtf8(FPDF_DOCUMENT doc, const char* tag) {
  unsigned long bytes = FPDF_GetMetaText(doc, tag, nullptr, 0);
  if (bytes <= 2) return std::string();
  std::u16string buffer;
  buffer.resize(static_cast<size_t>(bytes / 2));
  FPDF_GetMetaText(doc, tag, reinterpret_cast<unsigned short*>(&buffer[0]), bytes);
  return Utf16LeToUtf8(buffer);
}

static std::string MapPdfiumErrorToMessage(FPDF_DWORD code) {
  switch (code) {
    case FPDF_ERR_SUCCESS: return "Sucesso";
    case FPDF_ERR_FILE: return "Erro de arquivo (não encontrado ou inacessível)";
    case FPDF_ERR_FORMAT: return "Formato de arquivo inválido ou corrompido";
    case FPDF_ERR_PASSWORD: return "PDF protegido por senha (senha incorreta ou ausente)";
    case FPDF_ERR_SECURITY: return "Erro de segurança ao abrir o PDF";
    case FPDF_ERR_PAGE: return "Erro ao processar página";
    default: return "Falha ao abrir PDF";
  }
}

Napi::Value ExtractPdf(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !(info[0].IsString() || info[0].IsBuffer())) {
    Napi::TypeError::New(env, "Primeiro argumento deve ser caminho (string) ou Buffer").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string filePath;
  std::string password;
  int pageStart = -1; // 1-based inclusivo
  int pageEnd = -1;   // 1-based inclusivo
  if (info.Length() >= 2) {
    if (info[1].IsString()) {
      password = info[1].As<Napi::String>();
    } else if (info[1].IsObject()) {
      Napi::Object opts = info[1].As<Napi::Object>();
      if (opts.Has("password") && opts.Get("password").IsString()) {
        password = opts.Get("password").As<Napi::String>();
      }
      if (opts.Has("pageStart") && opts.Get("pageStart").IsNumber()) {
        pageStart = opts.Get("pageStart").As<Napi::Number>().Int32Value();
      }
      if (opts.Has("pageEnd") && opts.Get("pageEnd").IsNumber()) {
        pageEnd = opts.Get("pageEnd").As<Napi::Number>().Int32Value();
      }
    }
  }

  FPDF_DOCUMENT doc = nullptr;
  if (info[0].IsString()) {
    filePath = info[0].As<Napi::String>();
    doc = FPDF_LoadDocument(filePath.c_str(), password.empty() ? nullptr : password.c_str());
  } else {
    // Buffer de bytes do PDF
    Napi::Buffer<uint8_t> buf = info[0].As<Napi::Buffer<uint8_t>>();
    const void* dataPtr = buf.Data();
    size_t dataLen = buf.Length();
    // Preferir API 64 quando disponível; aqui usamos a variante padrão
    doc = FPDF_LoadMemDocument(dataPtr, static_cast<int>(dataLen), password.empty() ? nullptr : password.c_str());
  }
  if (!doc) {
    FPDF_DWORD code = FPDF_GetLastError();
    Napi::Error::New(env, MapPdfiumErrorToMessage(code)).ThrowAsJavaScriptException();
    return env.Null();
  }

  int pageCount = FPDF_GetPageCount(doc);

  // Normalizar faixa de páginas (1-based inclusiva)
  int startIndex = 0;
  int endIndex = pageCount - 1;
  if (pageStart > 0) startIndex = (std::max)(0, pageStart - 1);
  if (pageEnd > 0) endIndex = (std::min)(pageCount - 1, pageEnd - 1);
  if (startIndex > endIndex) {
    FPDF_CloseDocument(doc);
    Napi::Error::New(env, "Faixa de páginas inválida").ThrowAsJavaScriptException();
    return env.Null();
    }

  Napi::Object result = Napi::Object::New(env);
  Napi::Object metadata = Napi::Object::New(env);
  metadata.Set("title", Napi::String::New(env, ReadMetaTextAsUtf8(doc, "Title")));
  metadata.Set("author", Napi::String::New(env, ReadMetaTextAsUtf8(doc, "Author")));
  metadata.Set("pages", Napi::Number::New(env, pageCount));
  result.Set("metadata", metadata);

  Napi::Array pages = Napi::Array::New(env, static_cast<uint32_t>(endIndex - startIndex + 1));

  for (int i = startIndex; i <= endIndex; ++i) {
    FPDF_PAGE page = FPDF_LoadPage(doc, i);
    if (!page) {
      pages.Set(i - startIndex, Napi::Object::New(env));
      continue;
    }

    FPDF_TEXTPAGE textPage = FPDFText_LoadPage(page);
    std::u16string textContent;
    if (textPage) {
      int charCount = FPDFText_CountChars(textPage);
      if (charCount > 0) {
        // FPDFText_GetText requer um buffer (UTF-16LE) com espaço para NUL final
        std::u16string buffer(static_cast<size_t>(charCount + 1), u'\0');
        int written = FPDFText_GetText(
          textPage,
          0,
          charCount,
          reinterpret_cast<unsigned short*>(buffer.data())
        );
        if (written > 0) {
          // 'written' inclui o NUL final; removê-lo ao montar o conteúdo
          if (written > 1) buffer.resize(static_cast<size_t>(written - 1));
          else buffer.resize(0);
          textContent = buffer;
        }
      }
      FPDFText_ClosePage(textPage);
    }

    // Converter UTF-16LE para UTF-8
    std::string utf8 = Utf16LeToUtf8(textContent);

    Napi::Object pageObj = Napi::Object::New(env);
    pageObj.Set("page", Napi::Number::New(env, i + 1));
    pageObj.Set("text", Napi::String::New(env, utf8));
    pages.Set(i - startIndex, pageObj);

    FPDF_ClosePage(page);
  }

  FPDF_CloseDocument(doc);

  result.Set("pages", pages);
  return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "extractPdf"), Napi::Function::New(env, ExtractPdf));
  return exports;
}

NODE_API_MODULE(pdf_extractor, Init)


