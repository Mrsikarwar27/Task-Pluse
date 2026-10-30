import { useEffect, useState } from 'react';
import { Image as ImageIcon, Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn, isHttpUrl } from '../lib/utils.js';

function ResourcePreview({ url }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [url]);

  if (!isHttpUrl(url)) return null;

  return (
    <div className="relative mt-3 h-40 overflow-hidden rounded-xl border border-line bg-primary-softer">
      {failed ? (
        <div className="flex h-full items-center justify-center gap-2 text-xs font-medium text-muted">
          <ImageIcon className="h-4 w-4" />
          Image preview unavailable
        </div>
      ) : (
        <>
          {!loaded ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-medium text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading preview…
            </div>
          ) : null}
          <img
            src={url}
            alt="Resource preview"
            className={cn(
              'h-40 w-full object-cover transition-opacity duration-200',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      )}
    </div>
  );
}

export default function ResourceEditor({ resources, onChange, errors = {} }) {
  const addResource = () => {
    onChange([
      ...resources,
      {
        key: `resource-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: '',
        url: '',
        type: 'link',
      },
    ]);
  };

  const updateResource = (index, key, value) => {
    onChange(
      resources.map((resource, resourceIndex) =>
        resourceIndex === index ? { ...resource, [key]: value } : resource
      )
    );
  };

  const removeResource = (index) => {
    onChange(resources.filter((_, resourceIndex) => resourceIndex !== index));
  };

  return (
    <div className="space-y-3">
      {resources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#EADACD] bg-primary-softer px-4 py-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Link2 className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-bold text-ink">No resources added</p>
          <p className="mt-1 text-xs text-muted">
            Add a link or an image URL to give the client context.
          </p>
          <button type="button" className="btn-secondary btn-sm mt-4" onClick={addResource}>
            <Plus className="h-3.5 w-3.5" />
            Add Resource
          </button>
        </div>
      ) : (
        resources.map((resource, index) => (
          <div key={resource.key} className="rounded-xl border border-line bg-primary-softer p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Resource {index + 1}
              </p>
              <button
                type="button"
                onClick={() => removeResource(index)}
                className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-muted transition hover:bg-dangerSoft hover:text-danger"
                aria-label={`Remove resource ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)_120px]">
              <div>
                <label htmlFor={`resource-label-${index}`} className="sr-only">
                  Resource {index + 1} label
                </label>
                <input
                  id={`resource-label-${index}`}
                  className={cn('input', errors[`resource-${index}-label`] && 'border-danger')}
                  placeholder="Label, e.g. Brand brief"
                  value={resource.label}
                  onChange={(event) => updateResource(index, 'label', event.target.value)}
                />
                {errors[`resource-${index}-label`] ? (
                  <p className="field-error">{errors[`resource-${index}-label`]}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`resource-url-${index}`} className="sr-only">
                  Resource {index + 1} URL
                </label>
                <input
                  id={`resource-url-${index}`}
                  className={cn('input', errors[`resource-${index}-url`] && 'border-danger')}
                  placeholder="https://example.com/resource"
                  value={resource.url}
                  onChange={(event) => updateResource(index, 'url', event.target.value)}
                  inputMode="url"
                />
                {errors[`resource-${index}-url`] ? (
                  <p className="field-error">{errors[`resource-${index}-url`]}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`resource-type-${index}`} className="sr-only">
                  Resource {index + 1} type
                </label>
                <select
                  id={`resource-type-${index}`}
                  className="select"
                  value={resource.type}
                  onChange={(event) => updateResource(index, 'type', event.target.value)}
                >
                  <option value="link">Link</option>
                  <option value="image">Image</option>
                </select>
              </div>
            </div>

            {resource.type === 'image' ? (
              <ResourcePreview url={resource.url.trim()} />
            ) : resource.url.trim() ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                <Link2 className="h-3 w-3" />
                Opens as a normal link. Choose “Image” to show a thumbnail preview.
              </p>
            ) : null}
          </div>
        ))
      )}

      {resources.length > 0 ? (
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={addResource}
          disabled={resources.length >= 10}
        >
          <Plus className="h-3.5 w-3.5" />
          Add another resource
        </button>
      ) : null}
      <p className="text-[11px] text-muted">
        Only the URL text is stored. TaskPulse does not upload or store files.
      </p>
    </div>
  );
}
