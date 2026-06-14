import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";

const SIGN_HASH_ENDPOINT = "http://localhost:8787/sign/hash";
const SIGN_PDF_ENDPOINT = "http://localhost:8787/sign/pdf";

@Component({
  selector: "app-root",
  imports: [FormsModule],
  template: `
    <main class="shell">
      <section class="intro">
        <p class="eyebrow">FirmaGob hash signing</p>
        <h1>Prueba de firma hash desde Angular</h1>
        <p class="summary">
          Este ejemplo envia un hash SHA-256 base64 a una API Hono local que
          usa <code>@ltorresu82/firmagob-client</code>. No sube documentos ni
          guarda credenciales en el frontend.
        </p>
      </section>

      <section class="workspace" aria-label="Formulario de firma hash">
        <form class="panel" (ngSubmit)="signHash()">
          <div class="field-header">
            <label for="pdf">PDF para firma directa</label>
            <span>{{ fileLabel() }}</span>
          </div>
          <input
            id="pdf"
            name="pdf"
            type="file"
            accept="application/pdf"
            (change)="selectFile($event)"
          />

          <div class="field-header">
            <label for="hash">Hash SHA-256 base64</label>
            <span>{{ hashLength() }} caracteres</span>
          </div>
          <textarea
            id="hash"
            name="hash"
            [(ngModel)]="hash"
            placeholder="Pegar hash preparado"
            spellcheck="false"
          ></textarea>

          <div class="field-header">
            <label for="otp">OTP de firma atendida</label>
            <span>Solo Propósito General</span>
          </div>
          <input
            id="otp"
            name="otp"
            [(ngModel)]="otp"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="8"
            placeholder="6 digitos"
          />

          @if (validationMessage()) {
            <p class="message" role="alert">{{ validationMessage() }}</p>
          }

          <div class="actions">
            <button type="submit" [disabled]="loading() || !canSubmit()">
              {{ loading() ? "Firmando..." : submitLabel() }}
            </button>
            <code>{{ activeEndpoint() }}</code>
          </div>
        </form>

        <aside class="result" aria-label="Respuesta de la API">
          <div class="result-header">
            <h2>Respuesta</h2>
            @if (status()) {
              <span>{{ status() }}</span>
            }
          </div>
          <pre>{{ output() }}</pre>
        </aside>
      </section>
    </main>
  `,
  styles: [
    `
      .shell {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 40px 0;
      }

      .intro {
        max-width: 780px;
        margin-bottom: 28px;
      }

      .eyebrow {
        margin: 0 0 10px;
        color: #356a45;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        color: #111827;
        font-size: 36px;
        line-height: 1.1;
      }

      .summary {
        margin: 14px 0 0;
        color: #526071;
        font-size: 16px;
        line-height: 1.6;
      }

      .workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
        gap: 20px;
        align-items: start;
      }

      .panel,
      .result {
        border: 1px solid #d7dee8;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 16px 40px rgb(17 24 39 / 8%);
      }

      .panel {
        display: grid;
        gap: 14px;
        padding: 20px;
      }

      .field-header,
      .result-header,
      .actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      label,
      h2 {
        color: #111827;
        font-weight: 800;
      }

      h2 {
        margin: 0;
        font-size: 16px;
      }

      .field-header span,
      .result-header span,
      .actions code {
        color: #64748b;
        font-size: 12px;
      }

      textarea {
        width: 100%;
        min-height: 260px;
        resize: vertical;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 12px;
        color: #0f172a;
        background: #f8fafc;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 13px;
        line-height: 1.5;
      }

      textarea:focus {
        outline: 3px solid rgb(37 99 235 / 18%);
        border-color: #2563eb;
        background: #ffffff;
      }

      button {
        border: 0;
        border-radius: 6px;
        padding: 11px 16px;
        color: #ffffff;
        background: #1f5f3f;
        font-weight: 800;
        cursor: pointer;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .message {
        margin: 0;
        color: #a33a22;
        font-size: 14px;
      }

      .result {
        overflow: hidden;
      }

      .result-header {
        min-height: 56px;
        padding: 0 16px;
        border-bottom: 1px solid #e2e8f0;
      }

      pre {
        min-height: 322px;
        max-height: 520px;
        margin: 0;
        overflow: auto;
        padding: 16px;
        color: #0f172a;
        background: #fbfcfe;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }

      input {
        width: min(220px, 100%);
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 11px 12px;
        color: #0f172a;
        background: #f8fafc;
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        font-size: 14px;
      }

      input[type="file"] {
        width: 100%;
        font-family: inherit;
      }

      @media (max-width: 820px) {
        .workspace {
          grid-template-columns: 1fr;
        }

        h1 {
          font-size: 30px;
        }

        .actions {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class App {
  protected readonly hash = signal("");
  protected readonly otp = signal("");
  protected readonly file = signal<File | null>(null);
  protected readonly loading = signal(false);
  protected readonly status = signal("");
  protected readonly output = signal("Sin respuesta.");

  protected readonly hashLength = computed(() => this.hash().trim().length);
  protected readonly hasFile = computed(() => this.file() !== null);
  protected readonly canSubmit = computed(() => this.hasFile() || this.hashLength() > 0);
  protected readonly activeEndpoint = computed(() =>
    this.hasFile() ? SIGN_PDF_ENDPOINT : SIGN_HASH_ENDPOINT
  );
  protected readonly submitLabel = computed(() =>
    this.hasFile() ? "Firmar PDF" : "Firmar hash"
  );
  protected readonly fileLabel = computed(() => {
    const file = this.file();

    return file ? `${file.name} (${file.size} bytes)` : "Opcional";
  });
  protected readonly validationMessage = computed(() =>
    this.hash().length > 0 && this.hashLength() === 0
      ? "El hash no puede estar vacio."
      : ""
  );

  private readonly http = inject(HttpClient);

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.item(0) ?? null);
  }

  protected async signHash(): Promise<void> {
    const hash = this.hash().trim();
    const otp = this.otp().trim();
    const file = this.file();

    if (!file && !hash) {
      return;
    }

    this.loading.set(true);
    this.status.set("Enviando");
    this.output.set("Esperando respuesta de la API Hono...");

    try {
      const response = file
        ? await this.signPdf(file, otp)
        : await firstValueFrom(
            this.http.post<unknown>(SIGN_HASH_ENDPOINT, {
              hash,
              ...(otp ? { otp } : {}),
            })
          );
      this.status.set("HTTP 200");
      this.output.set(JSON.stringify(response, null, 2));
    } catch (error) {
      this.status.set("Error");
      this.output.set(formatError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private signPdf(file: File, otp: string): Promise<unknown> {
    const form = new FormData();
    form.set("file", file);

    if (otp) {
      form.set("otp", otp);
    }

    return firstValueFrom(this.http.post<unknown>(SIGN_PDF_ENDPOINT, form));
  }
}

function formatError(error: unknown): string {
  if (error && typeof error === "object" && "error" in error) {
    return JSON.stringify((error as { error: unknown }).error, null, 2);
  }

  return error instanceof Error ? error.message : "Unexpected error";
}
