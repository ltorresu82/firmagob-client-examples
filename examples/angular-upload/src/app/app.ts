import { HttpClient } from "@angular/common/http";
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  DomSanitizer,
  SafeResourceUrl,
} from "@angular/platform-browser";
import { firstValueFrom } from "rxjs";

const API_BASE_URL = "http://localhost:8787";
const SIGN_HASH_ENDPOINT = `${API_BASE_URL}/sign/hash`;
const SIGN_PDF_ENDPOINT = `${API_BASE_URL}/sign/pdf`;

type DemoMode = "pdf" | "hash";

type ConfigResponse = {
  purpose: string;
  requiresOtp: boolean;
};

type SignPdfResponse = {
  input?: {
    fileName?: string;
    fileSize?: number;
    checksum?: string;
  };
  result?: {
    files?: Array<{
      content?: string;
      status?: string;
      documentStatus?: string;
      description?: string;
      checksum_original?: string;
      contentType?: string;
    }>;
    metadata?: {
      filesSigned?: number;
      hashesSigned?: number;
      signedFailed?: number;
      otpExpired?: boolean;
    };
  };
};

@Component({
  selector: "app-root",
  imports: [FormsModule],
  template: `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">FirmaGob sandbox</p>
          <h1>Firma digital de documentos</h1>
        </div>
        <div class="mode-card">
          <span>Modo API</span>
          <strong>{{ configLabel() }}</strong>
        </div>
      </header>

      <section class="workspace" aria-label="Demo FirmaGob">
        <section class="document-pane" aria-label="Documento">
          <div class="viewer-header">
            <div>
              <h2>{{ selectedFileName() }}</h2>
              <p>{{ documentSubtitle() }}</p>
            </div>
            <div class="segmented" aria-label="Tipo de firma">
              <button
                type="button"
                [class.active]="mode() === 'pdf'"
                (click)="mode.set('pdf')"
              >
                PDF
              </button>
              <button
                type="button"
                [class.active]="mode() === 'hash'"
                (click)="mode.set('hash')"
              >
                Hash
              </button>
            </div>
          </div>

          @if (mode() === 'pdf') {
            <div class="file-row">
              <label for="pdf">Seleccionar PDF</label>
              <input
                id="pdf"
                name="pdf"
                type="file"
                accept="application/pdf"
                (change)="selectFile($event)"
              />
            </div>

            <div class="visible-signature">
              <label class="check-row">
                <input
                  type="checkbox"
                  [ngModel]="visibleSignature()"
                  (ngModelChange)="visibleSignature.set($event)"
                  name="visibleSignature"
                />
                <span>Agregar apariencia visible oficial</span>
              </label>

              @if (visibleSignature()) {
                <div class="visible-grid">
                  <label for="visibleSigner">Nombre visible</label>
                  <input
                    id="visibleSigner"
                    name="visibleSigner"
                    [(ngModel)]="visibleSigner"
                    maxlength="70"
                  />
                  <div class="signature-preview" aria-label="Vista previa del sello">
                    <div>
                      <strong>{{ visibleSigner() || "Firmante" }}</strong>
                      <span>Firmado digitalmente via FirmaGob</span>
                      <small>{{ visibleDateLabel() }}</small>
                    </div>
                    <b>FirmaGob</b>
                  </div>
                </div>
              }
            </div>

            <div class="preview-grid">
              <article class="preview">
                <div class="preview-title">
                  <span>Original</span>
                  <small>{{ originalSizeLabel() }}</small>
                </div>
                @if (originalPdfSafeUrl()) {
                  <iframe
                    title="PDF original"
                    [src]="originalPdfSafeUrl()"
                  ></iframe>
                } @else {
                  <div class="empty-state">
                    <strong>Sin documento</strong>
                    <span>Selecciona un PDF pequeno para verlo aqui.</span>
                  </div>
                }
              </article>

              <article class="preview">
                <div class="preview-title">
                  <span>Firmado</span>
                  <small>{{ signedSizeLabel() }}</small>
                </div>
                @if (signedPdfSafeUrl()) {
                  <iframe
                    title="PDF firmado"
                    [src]="signedPdfSafeUrl()"
                  ></iframe>
                } @else {
                  <div class="empty-state signed">
                    <strong>Esperando firma</strong>
                    <span>El PDF firmado aparecera despues de firmar.</span>
                  </div>
                }
              </article>
            </div>
          } @else {
            <label class="hash-label" for="hash">Hash SHA-256 base64</label>
            <textarea
              id="hash"
              name="hash"
              [(ngModel)]="hash"
              placeholder="Pegar hash preparado"
              spellcheck="false"
            ></textarea>
          }
        </section>

        <aside class="sign-pane" aria-label="Firma">
          <div class="status-card" [class.ok]="isSigned()" [class.error]="hasError()">
            <span>{{ statusTitle() }}</span>
            <strong>{{ statusDetail() }}</strong>
          </div>

          <div class="field">
            <label for="otp">OTP</label>
            <input
              id="otp"
              name="otp"
              [(ngModel)]="otp"
              autocomplete="one-time-code"
              inputmode="numeric"
              maxlength="8"
              placeholder="6 digitos"
              [disabled]="!requiresOtp()"
            />
            <p>
              {{ requiresOtp()
                ? "Requerido para Proposito General."
                : "No requerido en modo Desatendido." }}
            </p>
          </div>

          <dl class="facts">
            <div>
              <dt>Endpoint</dt>
              <dd>{{ activeEndpoint() }}</dd>
            </div>
            <div>
              <dt>Archivo</dt>
              <dd>{{ selectedFileName() }}</dd>
            </div>
            <div>
              <dt>Checksum</dt>
              <dd>{{ checksumLabel() }}</dd>
            </div>
          </dl>

          <button
            class="primary"
            type="button"
            [disabled]="loading() || !canSubmit()"
            (click)="sign()"
          >
            {{ loading() ? "Firmando..." : submitLabel() }}
          </button>

          @if (signedPdfUrl()) {
            <a
              class="download"
              [href]="signedPdfUrl()"
              download="documento-firmado.pdf"
            >
              Descargar PDF firmado
            </a>
          }

          <details class="technical">
            <summary>Ver respuesta tecnica</summary>
            <pre>{{ output() }}</pre>
          </details>
        </aside>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background:
          linear-gradient(180deg, #f7f8f5 0%, #eef2ed 100%);
        color: #18211b;
        font-family:
          Avenir Next, Aptos, Segoe UI, system-ui, sans-serif;
      }

      .shell {
        width: min(1440px, calc(100vw - 40px));
        margin: 0 auto;
        padding: 28px 0 40px;
      }

      .topbar {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 22px;
      }

      .eyebrow {
        margin: 0 0 8px;
        color: #2f6b45;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: 34px;
        line-height: 1.05;
      }

      h2 {
        font-size: 18px;
      }

      .mode-card,
      .document-pane,
      .sign-pane,
      .preview {
        border: 1px solid #d8dfd6;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 18px 42px rgb(19 32 23 / 8%);
      }

      .mode-card {
        min-width: 220px;
        padding: 12px 14px;
      }

      .mode-card span,
      .preview-title small,
      .field p,
      .facts dt,
      .viewer-header p {
        color: #687568;
        font-size: 12px;
      }

      .mode-card strong {
        display: block;
        margin-top: 4px;
      }

      .workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 18px;
        align-items: start;
      }

      .document-pane,
      .sign-pane {
        padding: 18px;
      }

      .viewer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }

      .segmented {
        display: inline-grid;
        grid-template-columns: 1fr 1fr;
        border: 1px solid #cdd7ce;
        border-radius: 8px;
        overflow: hidden;
      }

      .segmented button {
        border: 0;
        padding: 9px 16px;
        background: #f5f7f4;
        color: #334035;
        font-weight: 800;
        cursor: pointer;
      }

      .segmented button.active {
        background: #1f5f3f;
        color: #ffffff;
      }

      .file-row,
      .field {
        display: grid;
        gap: 8px;
      }

      .visible-signature {
        display: grid;
        gap: 10px;
        margin-top: 14px;
        padding: 14px;
        border: 1px solid #dbe4d9;
        border-radius: 8px;
        background: #f9fbf8;
      }

      .check-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .check-row input {
        min-height: auto;
        width: 18px;
        height: 18px;
        padding: 0;
      }

      .visible-grid {
        display: grid;
        gap: 8px;
      }

      .signature-preview {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        max-width: 420px;
        min-height: 96px;
        padding: 14px 16px;
        border: 1px solid #2f6b45;
        border-radius: 6px;
        background: #ffffff;
      }

      .signature-preview div {
        display: grid;
        gap: 4px;
      }

      .signature-preview strong {
        color: #111827;
        font-size: 22px;
        line-height: 1.05;
      }

      .signature-preview span,
      .signature-preview small {
        color: #344438;
        font-size: 11px;
      }

      .signature-preview b {
        color: #1f5f3f;
        font-size: 13px;
      }

      label,
      .preview-title span {
        font-weight: 900;
      }

      input,
      textarea {
        border: 1px solid #cbd5c9;
        border-radius: 7px;
        background: #fbfcfb;
        color: #111827;
        font: inherit;
      }

      input {
        min-height: 40px;
        padding: 9px 11px;
      }

      input[type="file"] {
        width: 100%;
      }

      textarea {
        width: 100%;
        min-height: 560px;
        resize: vertical;
        padding: 14px;
        font-family: Consolas, ui-monospace, monospace;
        font-size: 13px;
      }

      .preview-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-top: 14px;
      }

      .preview {
        min-height: min(620px, calc(100vh - 260px));
        overflow: hidden;
      }

      .preview-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 46px;
        padding: 0 14px;
        border-bottom: 1px solid #e5ebe3;
      }

      iframe {
        width: 100%;
        height: clamp(430px, calc(100vh - 306px), 574px);
        border: 0;
        background: #f5f6f4;
      }

      .empty-state {
        display: grid;
        place-items: center;
        align-content: center;
        gap: 6px;
        min-height: clamp(430px, calc(100vh - 306px), 574px);
        padding: 24px;
        color: #748072;
        text-align: center;
      }

      .empty-state strong {
        color: #273427;
      }

      .empty-state.signed {
        background: #f8faf7;
      }

      .sign-pane {
        display: grid;
        gap: 16px;
      }

      .status-card {
        display: grid;
        gap: 5px;
        min-height: 86px;
        padding: 16px;
        border: 1px solid #d8dfd6;
        border-radius: 8px;
        background: #f8faf7;
      }

      .status-card span {
        color: #687568;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .status-card strong {
        font-size: 20px;
      }

      .status-card.ok {
        border-color: #8ec79c;
        background: #eff9f1;
      }

      .status-card.error {
        border-color: #e2a091;
        background: #fff4f1;
      }

      .facts {
        display: grid;
        gap: 10px;
        margin: 0;
      }

      .facts div {
        display: grid;
        gap: 3px;
      }

      .facts dd {
        margin: 0;
        overflow-wrap: anywhere;
        color: #202a21;
        font-size: 13px;
      }

      .primary,
      .download {
        min-height: 44px;
        border: 0;
        border-radius: 7px;
        background: #1f5f3f;
        color: #ffffff;
        font-weight: 900;
        text-align: center;
        text-decoration: none;
      }

      .primary {
        cursor: pointer;
      }

      .primary:disabled {
        cursor: not-allowed;
        opacity: 0.52;
      }

      .download {
        display: grid;
        place-items: center;
        background: #26362b;
      }

      .technical {
        border-top: 1px solid #e5ebe3;
        padding-top: 12px;
      }

      summary {
        cursor: pointer;
        font-weight: 900;
      }

      pre {
        max-height: 360px;
        overflow: auto;
        margin: 12px 0 0;
        padding: 12px;
        border-radius: 7px;
        background: #111827;
        color: #e5e7eb;
        font-family: Consolas, ui-monospace, monospace;
        font-size: 12px;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
      }

      @media (max-width: 1080px) {
        .workspace,
        .preview-grid {
          grid-template-columns: 1fr;
        }

        .sign-pane {
          position: static;
        }
      }

      @media (max-width: 720px) {
        .shell {
          width: min(100vw - 24px, 1440px);
          padding-top: 18px;
        }

        .topbar,
        .viewer-header {
          align-items: stretch;
          flex-direction: column;
        }

        h1 {
          font-size: 28px;
        }
      }
    `,
  ],
})
export class App implements OnInit, OnDestroy {
  protected readonly mode = signal<DemoMode>("pdf");
  protected readonly hash = signal("");
  protected readonly otp = signal("");
  protected readonly file = signal<File | null>(null);
  protected readonly visibleSignature = signal(true);
  protected readonly visibleSigner = signal("FirmaGob Sandbox");
  protected readonly originalPdfUrl = signal("");
  protected readonly originalPdfSafeUrl = signal<SafeResourceUrl | null>(null);
  protected readonly signedPdfUrl = signal("");
  protected readonly signedPdfSafeUrl = signal<SafeResourceUrl | null>(null);
  protected readonly signedPdfSize = signal(0);
  protected readonly checksum = signal("");
  protected readonly config = signal<ConfigResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly status = signal<"idle" | "sending" | "signed" | "error">(
    "idle"
  );
  protected readonly output = signal("Sin respuesta tecnica.");

  protected readonly requiresOtp = computed(
    () => this.config()?.requiresOtp ?? false
  );
  protected readonly activeEndpoint = computed(() =>
    this.mode() === "pdf" ? SIGN_PDF_ENDPOINT : SIGN_HASH_ENDPOINT
  );
  protected readonly selectedFileName = computed(
    () => this.file()?.name ?? "Documento de prueba"
  );
  protected readonly documentSubtitle = computed(() =>
    this.mode() === "pdf"
      ? "Vista previa del documento original y del PDF firmado por FirmaGob."
      : "Firma un hash ya calculado por otro sistema."
  );
  protected readonly originalSizeLabel = computed(() => {
    const file = this.file();

    return file ? `${file.size} bytes` : "Sin PDF";
  });
  protected readonly signedSizeLabel = computed(() =>
    this.signedPdfSize() > 0 ? `${this.signedPdfSize()} bytes` : "Pendiente"
  );
  protected readonly canSubmit = computed(() => {
    if (this.loading()) {
      return false;
    }

    if (this.requiresOtp() && this.otp().trim().length === 0) {
      return false;
    }

    return this.mode() === "pdf"
      ? this.file() !== null
      : this.hash().trim().length > 0;
  });
  protected readonly submitLabel = computed(() =>
    this.mode() === "pdf" ? "Firmar PDF" : "Firmar hash"
  );
  protected readonly configLabel = computed(
    () => this.config()?.purpose ?? "Cargando"
  );
  protected readonly checksumLabel = computed(() => this.checksum() || "Pendiente");
  protected readonly isSigned = computed(() => this.status() === "signed");
  protected readonly hasError = computed(() => this.status() === "error");
  protected readonly statusTitle = computed(() => {
    switch (this.status()) {
      case "sending":
        return "En proceso";
      case "signed":
        return "Firmado";
      case "error":
        return "Error";
      default:
        return "Listo para firmar";
    }
  });
  protected readonly statusDetail = computed(() => {
    switch (this.status()) {
      case "sending":
        return "Enviando a FirmaGob";
      case "signed":
        return "Documento firmado";
      case "error":
        return "Firma rechazada";
      default:
        return this.requiresOtp()
          ? "Selecciona documento e ingresa OTP"
          : "Selecciona documento";
    }
  });
  protected readonly visibleDateLabel = computed(() =>
    new Date().toISOString().replace("T", " ").slice(0, 19)
  );

  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  async ngOnInit(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<ConfigResponse>(`${API_BASE_URL}/config`)
      );
      this.config.set(config);
    } catch {
      this.output.set("No se pudo leer la configuracion de Hono.");
    }
  }

  ngOnDestroy(): void {
    this.revokeUrl(this.originalPdfUrl());
    this.revokeUrl(this.signedPdfUrl());
  }

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;

    this.file.set(file);
    this.clearSignedPdf();
    this.checksum.set("");

    this.revokeUrl(this.originalPdfUrl());
    this.originalPdfUrl.set("");
    this.originalPdfSafeUrl.set(null);

    if (file) {
      const url = URL.createObjectURL(file);
      this.originalPdfUrl.set(url);
      this.originalPdfSafeUrl.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(url)
      );
      this.status.set("idle");
    }
  }

  protected async sign(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    this.loading.set(true);
    this.status.set("sending");
    this.output.set("Esperando respuesta de FirmaGob...");
    this.clearSignedPdf();

    try {
      const response =
        this.mode() === "pdf"
          ? await this.signPdf()
          : await this.signHash();
      this.applyResponse(response);
    } catch (error) {
      this.status.set("error");
      this.output.set(formatError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private signHash(): Promise<unknown> {
    const otp = this.otp().trim();

    return firstValueFrom(
      this.http.post<unknown>(SIGN_HASH_ENDPOINT, {
        hash: this.hash().trim(),
        ...(otp ? { otp } : {}),
      })
    );
  }

  private signPdf(): Promise<SignPdfResponse> {
    const file = this.file();

    if (!file) {
      throw new Error("No PDF selected");
    }

    const form = new FormData();
    form.set("file", file);

    const otp = this.otp().trim();

    if (otp) {
      form.set("otp", otp);
    }

    if (this.visibleSignature()) {
      form.set("visibleSignature", "true");
      form.set("visibleSignatureImage", createVisibleSignaturePng(
        this.visibleSigner()
      ));
    }

    return firstValueFrom(this.http.post<SignPdfResponse>(SIGN_PDF_ENDPOINT, form));
  }

  private applyResponse(response: unknown): void {
    this.output.set(JSON.stringify(response, null, 2));

    if (isSignPdfResponse(response)) {
      const file = response.result?.files?.[0];
      const signedContent = file?.content;
      this.checksum.set(response.input?.checksum ?? file?.checksum_original ?? "");

      if (file?.documentStatus === "FIRMADO" || file?.status === "OK") {
        this.status.set("signed");
      }

      if (signedContent) {
        const bytes = base64ToBytes(signedContent);
        const buffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer;
        const blob = new Blob([buffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        this.signedPdfUrl.set(url);
        this.signedPdfSafeUrl.set(
          this.sanitizer.bypassSecurityTrustResourceUrl(url)
        );
        this.signedPdfSize.set(blob.size);
      }

      return;
    }

    if (JSON.stringify(response).includes("FIRMADO")) {
      this.status.set("signed");
      return;
    }

    this.status.set("idle");
  }

  private clearSignedPdf(): void {
    this.revokeUrl(this.signedPdfUrl());
    this.signedPdfUrl.set("");
    this.signedPdfSafeUrl.set(null);
    this.signedPdfSize.set(0);
  }

  private revokeUrl(url: string): void {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}

function isSignPdfResponse(value: unknown): value is SignPdfResponse {
  return Boolean(value && typeof value === "object" && "result" in value);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function createVisibleSignaturePng(signerName: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 300;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available");
  }

  const name = normalizeVisibleText(signerName, "Firmante");
  const signedAt = new Date().toISOString().replace("T", " ").slice(0, 19);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#245f3e";
  context.lineWidth = 4;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.fillStyle = "#245f3e";
  context.fillRect(8, 8, canvas.width - 16, 58);
  context.fillStyle = "#ffffff";
  context.font = "bold 28px Segoe UI, Arial, sans-serif";
  context.fillText("FIRMADO DIGITALMENTE", 32, 47);
  context.fillStyle = "#111827";
  context.font = "bold 54px Segoe UI, Arial, sans-serif";
  context.fillText(truncateVisibleText(name, 34), 32, 138);
  context.fillStyle = "#2f3f34";
  context.font = "24px Segoe UI, Arial, sans-serif";
  context.fillText("Firmado digitalmente via FirmaGob", 32, 190);
  context.fillText(`Fecha: ${signedAt} UTC`, 32, 228);
  context.fillStyle = "#1f5f3f";
  context.font = "bold 28px Segoe UI, Arial, sans-serif";
  context.fillText("FirmaGob", 726, 252);

  return canvas.toDataURL("image/png");
}

function normalizeVisibleText(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized : fallback;
}

function truncateVisibleText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
}

function formatError(error: unknown): string {
  if (error && typeof error === "object" && "error" in error) {
    return JSON.stringify((error as { error: unknown }).error, null, 2);
  }

  return error instanceof Error ? error.message : "Unexpected error";
}
