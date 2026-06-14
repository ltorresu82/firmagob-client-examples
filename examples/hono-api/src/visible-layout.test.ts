import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createVisibleSignatureLayout } from "./visible-layout.js";

describe("createVisibleSignatureLayout", () => {
  it("creates FirmaGob AgileSignerConfig XML with a base64 image", () => {
    const layout = createVisibleSignatureLayout({
      imageBase64: "data:image/png;base64,ZmlybWE=",
      llx: 10,
      lly: 20,
      urx: 210,
      ury: 120,
      page: "LAST",
    });

    assert.match(layout, /^<AgileSignerConfig>/);
    assert.match(layout, /<Visible active="true" layer2="false" label="true" pos="1">/);
    assert.match(layout, /<llx>10<\/llx>/);
    assert.match(layout, /<lly>20<\/lly>/);
    assert.match(layout, /<urx>210<\/urx>/);
    assert.match(layout, /<ury>120<\/ury>/);
    assert.match(layout, /<page>LAST<\/page>/);
    assert.match(layout, /<image>BASE64<\/image>/);
    assert.match(layout, /<BASE64VALUE>ZmlybWE=<\/BASE64VALUE>/);
  });
});
