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
const VISIBLE_SIGNATURE_SAMPLE_URL = `${API_BASE_URL}/visible-signature/sample`;
const VISIBLE_SIGNATURE_BASE_IMAGE_URL = "/firma1.png";

type DemoMode = "pdf" | "hash";

type ConfigResponse = {
  purpose: string;
  requiresOtp: boolean;
  modes: Array<{
    id: "unattended" | "attended";
    label: string;
    purpose: string;
    requiresOtp: boolean;
  }>;
};

type SignPdfResponse = {
  input?: {
    fileName?: string;
    fileSize?: number;
    checksum?: string;
    visibleSignature?: boolean;
    purpose?: string;
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
          <span>Modo firma</span>
          <strong>{{ selectedPurposeLabel() }}</strong>
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
                  (ngModelChange)="setVisibleSignature($event)"
                  name="visibleSignature"
                />
                <span>Agregar apariencia visible oficial</span>
              </label>

              @if (visibleSignature()) {
                <div class="visible-grid">
                  <div class="signature-preview" aria-label="Vista previa firma visible">
                    <img
                      [src]="visibleSignaturePreviewUrl() || visibleSignatureSampleUrl"
                      alt="Apariencia visible de firma"
                    />
                  </div>
                  <p>
                    Imagen PNG transparente generada para el layout oficial:
                    firma de muestra, modo, fecha y aviso de validacion.
                  </p>
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

          <div class="signature-mode" aria-label="Modo de firma">
            @for (mode of config()?.modes ?? []; track mode.id) {
              <label
                class="signature-choice"
                [class.active]="selectedPurpose() === mode.purpose"
              >
                <input
                  type="radio"
                  name="signaturePurpose"
                  [checked]="selectedPurpose() === mode.purpose"
                  (change)="selectPurpose(mode.purpose)"
                />
                <strong>{{ mode.label }}</strong>
                <span>{{ mode.requiresOtp ? "Con OTP" : "Sin OTP" }}</span>
              </label>
            }
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
        gap: 10px;
      }

      .signature-preview {
        display: grid;
        place-items: center;
        max-width: 420px;
        min-height: 132px;
        padding: 18px;
        border: 1px dashed #9aac9c;
        border-radius: 6px;
        background:
          linear-gradient(#ffffff, #ffffff) padding-box,
          repeating-linear-gradient(
            0deg,
            #ffffff 0,
            #ffffff 23px,
            #eef2ed 24px
          );
      }

      .signature-preview img {
        display: block;
        width: min(100%, 360px);
        height: auto;
        object-fit: contain;
      }

      .visible-grid p {
        color: #344438;
        font-size: 12px;
        line-height: 1.35;
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

      .signature-mode {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .signature-choice {
        display: grid;
        gap: 4px;
        min-height: 64px;
        padding: 10px 12px;
        border: 1px solid #cbd8ca;
        border-radius: 8px;
        background: #ffffff;
        color: #26362b;
        cursor: pointer;
        text-align: left;
      }

      .signature-choice.active {
        border-color: #1f5f3f;
        background: #eff8f1;
        box-shadow: inset 0 0 0 1px #1f5f3f;
      }

      .signature-choice input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }

      .signature-mode strong {
        font-size: 13px;
      }

      .signature-mode span {
        color: #687568;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
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
  protected readonly visibleSignaturePreviewUrl = signal("");
  protected readonly originalPdfUrl = signal("");
  protected readonly originalPdfSafeUrl = signal<SafeResourceUrl | null>(null);
  protected readonly signedPdfUrl = signal("");
  protected readonly signedPdfSafeUrl = signal<SafeResourceUrl | null>(null);
  protected readonly signedPdfSize = signal(0);
  protected readonly checksum = signal("");
  protected readonly config = signal<ConfigResponse | null>(null);
  protected readonly selectedPurpose = signal("");
  protected readonly loading = signal(false);
  protected readonly status = signal<"idle" | "sending" | "signed" | "error">(
    "idle"
  );
  protected readonly output = signal("Sin respuesta tecnica.");

  protected readonly requiresOtp = computed(
    () => this.selectedMode()?.requiresOtp ?? false
  );
  protected readonly selectedMode = computed(() =>
    this.config()?.modes.find((mode) => mode.purpose === this.selectedPurpose())
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

    if (this.selectedPurpose().length === 0) {
      return false;
    }

    return this.mode() === "pdf"
      ? this.file() !== null
      : this.hash().trim().length > 0;
  });
  protected readonly submitLabel = computed(() =>
    this.mode() === "pdf" ? "Firmar PDF" : "Firmar hash"
  );
  protected readonly selectedPurposeLabel = computed(
    () => this.selectedMode()?.label ?? "Cargando"
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
  protected readonly visibleSignatureSampleUrl = VISIBLE_SIGNATURE_SAMPLE_URL;

  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  async ngOnInit(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<ConfigResponse>(`${API_BASE_URL}/config`)
      );
      this.config.set(config);
      this.selectedPurpose.set(config.purpose);
    } catch {
      this.output.set("No se pudo leer la configuracion de Hono.");
    }

    await this.refreshVisibleSignaturePreview();
  }

  ngOnDestroy(): void {
    this.revokeUrl(this.originalPdfUrl());
    this.revokeUrl(this.signedPdfUrl());
    this.revokeUrl(this.visibleSignaturePreviewUrl());
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

  protected selectPurpose(purpose: string): void {
    this.selectedPurpose.set(purpose);
    this.clearSignedPdf();
    this.status.set("idle");
    void this.refreshVisibleSignaturePreview();

    if (!this.requiresOtp()) {
      this.otp.set("");
    }
  }

  protected setVisibleSignature(value: boolean): void {
    this.visibleSignature.set(value);
    this.clearSignedPdf();

    if (value) {
      void this.refreshVisibleSignaturePreview();
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
        purpose: this.selectedPurpose(),
        ...(otp ? { otp } : {}),
      })
    );
  }

  private async signPdf(): Promise<SignPdfResponse> {
    const file = this.file();

    if (!file) {
      throw new Error("No PDF selected");
    }

    const form = new FormData();
    form.set("file", file);
    form.set("purpose", this.selectedPurpose());

    const otp = this.otp().trim();

    if (otp) {
      form.set("otp", otp);
    }

    if (this.visibleSignature()) {
      form.set("visibleSignature", "true");
      form.set(
        "visibleSignatureImage",
        await this.getVisibleSignatureImageDataUrl()
      );
    }

    return firstValueFrom(this.http.post<SignPdfResponse>(SIGN_PDF_ENDPOINT, form));
  }

  private async getVisibleSignatureImageDataUrl(): Promise<string> {
    if (!this.visibleSignaturePreviewUrl()) {
      await this.refreshVisibleSignaturePreview();
    }

    const dataUrl = this.visibleSignaturePreviewUrl();

    if (!dataUrl) {
      throw new Error("No se pudo preparar la apariencia visible");
    }

    return dataUrl;
  }

  private async refreshVisibleSignaturePreview(): Promise<void> {
    const previousUrl = this.visibleSignaturePreviewUrl();

    try {
      const dataUrl = await createVisibleSignatureAppearance({
        imageUrl: VISIBLE_SIGNATURE_BASE_IMAGE_URL,
        purposeLabel: this.selectedPurposeLabel(),
        generatedAt: new Date(),
      });

      this.visibleSignaturePreviewUrl.set(dataUrl);
      this.revokeUrl(previousUrl);
    } catch (error) {
      this.visibleSignaturePreviewUrl.set("");
      this.output.set(formatError(error));
    }
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
    if (url.startsWith("blob:")) {
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

async function createVisibleSignatureAppearance(options: {
  imageUrl: string;
  purposeLabel: string;
  generatedAt: Date;
}): Promise<string> {
  const signatureImage = await loadImage(options.imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 390;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  roundRect(context, 18, 18, canvas.width - 36, canvas.height - 36, 24);
  context.fill();
  context.strokeStyle = "rgba(31, 95, 63, 0.5)";
  context.lineWidth = 4;
  roundRect(context, 18, 18, canvas.width - 36, canvas.height - 36, 24);
  context.stroke();

  context.drawImage(signatureImage, 44, 82, 510, 186);
  context.strokeStyle = "rgba(31, 95, 63, 0.28)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(590, 74);
  context.lineTo(590, 315);
  context.stroke();

  context.fillStyle = "#1f5f3f";
  context.font = "bold 30px Segoe UI, Arial, sans-serif";
  context.fillText("FIRMADO DIGITALMENTE", 630, 104);
  context.fillStyle = "#111827";
  context.font = "bold 44px Segoe UI, Arial, sans-serif";
  context.fillText("FirmaGob", 630, 160);
  context.fillStyle = "#2f3f34";
  context.font = "25px Segoe UI, Arial, sans-serif";
  context.fillText(`Modo: ${normalizeAppearanceText(options.purposeLabel)}`, 630, 214);
  context.fillText(`Fecha: ${formatAppearanceDate(options.generatedAt)}`, 630, 254);
  context.font = "21px Segoe UI, Arial, sans-serif";
  context.fillText("Validez verificable en el panel de firmas del PDF", 630, 306);

  return canvas.toDataURL("image/png");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return requestImageBlob(url)
    .then(blobToDataUrl)
    .then((dataUrl) => loadImageDataUrl(dataUrl));
}

function requestImageBlob(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", url);
    request.responseType = "blob";
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response as Blob);
        return;
      }

      reject(new Error("Could not load visible signature image"));
    };
    request.onerror = () => reject(new Error("Could not load visible signature image"));
    request.send();
  });
}

function loadImageDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load visible signature image"));
    image.src = dataUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read visible signature image"));
    };
    reader.onerror = () => reject(new Error("Could not read visible signature image"));
    reader.readAsDataURL(blob);
  });
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function normalizeAppearanceText(value: string): string {
  return value.trim().replace(/\s+/g, " ") || "FirmaGob";
}

function formatAppearanceDate(date: Date): string {
  const pad = (value: number): string => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
}

function formatError(error: unknown): string {
  if (error && typeof error === "object" && "error" in error) {
    return JSON.stringify((error as { error: unknown }).error, null, 2);
  }

  return error instanceof Error ? error.message : "Unexpected error";
}
