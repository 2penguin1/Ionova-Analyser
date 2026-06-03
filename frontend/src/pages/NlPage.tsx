import { Sparkles } from 'lucide-react';
import { Card } from '~/ui/Card';
import { Input, PageHeader } from '~/ui/primitives';
import { Button } from '~/ui/Button';

/**
 * Natural-language search — PLACEHOLDER ONLY.
 *
 * The feature is intentionally not implemented yet. The whole search stack
 * already runs on a Query AST, and the backend exposes a stubbed /nl/search
 * endpoint plus an NlTranslator seam. Adding NL later means implementing the
 * translator (question -> AST) and flipping ANALYZER_ENABLE_NL_SEARCH — no
 * changes to the compiler, indexes, or results UI.
 */
export default function NlPage() {
  return (
    <div>
      <PageHeader title="Natural Language Search" subtitle="Ask questions in plain English." />

      <Card className="p-8 text-center">
        <Sparkles className="mx-auto text-accent" size={32} />
        <h3 className="mt-3">Coming soon</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)] max-w-xl mx-auto">
          This will let you type questions like{' '}
          <em>"Show all addresses where country was predicted as France but should be Germany"</em>{' '}
          and translate them into the same structured query the Builder and DSL use. The plumbing
          is already in place; the translator is planned for a future release.
        </p>

        <div className="mt-6 flex items-center gap-2 max-w-xl mx-auto opacity-60 pointer-events-none">
          <Input placeholder="Ask a question… (disabled)" disabled />
          <Button disabled>Ask</Button>
        </div>
      </Card>
    </div>
  );
}
