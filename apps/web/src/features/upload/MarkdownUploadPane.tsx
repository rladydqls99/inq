type MarkdownUploadPaneProps = {
  markdown: string;
  onChangeMarkdown: (markdown: string) => void;
};

export function MarkdownUploadPane({
  markdown,
  onChangeMarkdown,
}: MarkdownUploadPaneProps) {
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    onChangeMarkdown(await readFileText(file));
  }

  return (
    <section className="upload-pane" data-testid="upload-source-pane">
      <h2>Markdown</h2>
      <label>
        Markdown file
        <input accept=".md,.markdown,text/markdown,text/plain" type="file" onChange={handleFileChange} />
      </label>
      <label>
        Markdown source
        <textarea
          value={markdown}
          onChange={(event) => onChangeMarkdown(event.target.value)}
        />
      </label>
    </section>
  );
}

async function readFileText(file: File) {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}
