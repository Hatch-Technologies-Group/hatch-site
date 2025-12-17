import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export const BASE_FLYER_SCHEMA = {
  page: { width: 612, height: 792 },
  imageSlots: [{ id: 'hero', x: 36, y: 330, width: 540, height: 420, fit: 'cover' }],
  textSlots: [
    { id: 'address', x: 36, y: 300, size: 18, maxWidth: 540 },
    { id: 'cityStateZip', x: 36, y: 280, size: 12, maxWidth: 540 },
    { id: 'price', x: 36, y: 252, size: 16, maxWidth: 540 },
    { id: 'agentName', x: 36, y: 200, size: 12, maxWidth: 540 },
    { id: 'agentPhone', x: 36, y: 182, size: 12, maxWidth: 540 },
    { id: 'agentEmail', x: 36, y: 164, size: 12, maxWidth: 540 },
    { id: 'brokerageName', x: 36, y: 120, size: 10, maxWidth: 540 }
  ],
  watermark: { enabled: true, text: 'Hatch', opacity: 0.12, size: 42 }
};

const schemaEditorSchema = z
  .object({
    page: z
      .object({
        width: z.number().positive(),
        height: z.number().positive()
      })
      .optional()
      .default({ width: 612, height: 792 }),
    imageSlots: z
      .array(
        z.object({
          id: z.string().min(1),
          x: z.number(),
          y: z.number(),
          width: z.number().positive(),
          height: z.number().positive(),
          fit: z.enum(['cover', 'contain']).optional().default('cover')
        })
      )
      .optional()
      .default([]),
    textSlots: z
      .array(
        z.object({
          id: z.string().min(1),
          x: z.number(),
          y: z.number(),
          size: z.number().positive().optional().default(12),
          color: z.string().optional(),
          maxWidth: z.number().positive().optional(),
          align: z.enum(['left', 'center', 'right']).optional().default('left')
        })
      )
      .optional()
      .default([]),
    watermark: z
      .object({
        enabled: z.boolean().optional().default(true),
        text: z.string().optional().default('Hatch'),
        opacity: z.number().min(0).max(1).optional().default(0.12),
        size: z.number().positive().optional().default(42),
        x: z.number().optional(),
        y: z.number().optional()
      })
      .optional()
  })
  .passthrough();

type EditorSchema = z.infer<typeof schemaEditorSchema>;
type ImageSlot = EditorSchema['imageSlots'][number];
type TextSlot = EditorSchema['textSlots'][number];
type SlotKey = { type: 'image' | 'text'; id: string } | null;

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeUniqueId(prefix: string, existing: Set<string>) {
  const base = prefix.trim().length > 0 ? prefix.trim() : 'slot';
  for (let i = 1; i < 10_000; i += 1) {
    const candidate = `${base}_${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}_${Math.random().toString(16).slice(2)}`;
}

function DraggableSlot(props: {
  dragId: string;
  label: string;
  style: CSSProperties;
  disabled?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { dragId, label, style, disabled, selected, onSelect } = props;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId, disabled });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={[
        'absolute flex items-center justify-center rounded-md border text-[10px] font-semibold outline-none transition',
        selected ? 'border-primary bg-primary/10 text-primary' : 'border-slate-300 bg-white/70 text-slate-700',
        isDragging ? 'shadow-md' : 'hover:bg-white'
      ].join(' ')}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: isDragging ? 0.9 : 1
      }}
      {...attributes}
      {...listeners}
    >
      {label}
    </button>
  );
}

export function TemplateSchemaEditor(props: { value: unknown; onChange: (next: unknown) => void; disabled?: boolean }) {
  const { value, onChange, disabled } = props;

  const schema = useMemo<EditorSchema>(() => {
    const parsed = schemaEditorSchema.safeParse(value);
    if (parsed.success) return parsed.data;
    return schemaEditorSchema.parse(BASE_FLYER_SCHEMA);
  }, [value]);

  const page = schema.page ?? { width: 612, height: 792 };
  const existingIds = useMemo(() => {
    return new Set([...schema.imageSlots.map((slot) => slot.id), ...schema.textSlots.map((slot) => slot.id)]);
  }, [schema.imageSlots, schema.textSlots]);

  const [selectedSlot, setSelectedSlot] = useState<SlotKey>(null);

  const [schemaJson, setSchemaJson] = useState(() => JSON.stringify(schema, null, 2));
  const [schemaJsonDirty, setSchemaJsonDirty] = useState(false);
  const [schemaJsonError, setSchemaJsonError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(420);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (!width) return;
      setCanvasWidth(width);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (schemaJsonDirty) return;
    setSchemaJson(JSON.stringify(schema, null, 2));
    setSchemaJsonError(null);
  }, [schema, schemaJsonDirty]);

  const scale = page.width > 0 ? canvasWidth / page.width : 1;
  const canvasHeight = page.height * scale;

  const commitSchema = (nextSchema: EditorSchema) => {
    onChange(nextSchema);
    setSchemaJsonDirty(false);
    setSchemaJsonError(null);
  };

  const updateSchema = (fn: (current: EditorSchema) => EditorSchema) => {
    const next = fn(deepClone(schema));
    commitSchema(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const deltaX = event.delta.x;
    const deltaY = event.delta.y;
    const [kind, slotId] = activeId.split(':', 2);
    if (!kind || !slotId) return;

    updateSchema((draft) => {
      if (kind === 'image') {
        const slot = draft.imageSlots.find((s) => s.id === slotId);
        if (!slot) return draft;
        const nextX = slot.x + deltaX / scale;
        const nextY = slot.y - deltaY / scale;
        slot.x = clamp(nextX, 0, Math.max(0, page.width - slot.width));
        slot.y = clamp(nextY, 0, Math.max(0, page.height - slot.height));
        return draft;
      }

      if (kind === 'text') {
        const slot = draft.textSlots.find((s) => s.id === slotId);
        if (!slot) return draft;
        const nextX = slot.x + deltaX / scale;
        const nextY = slot.y - deltaY / scale;
        slot.x = clamp(nextX, 0, Math.max(0, page.width));
        slot.y = clamp(nextY, 0, Math.max(0, page.height));
        return draft;
      }

      return draft;
    });
  };

  const handleApplyJson = () => {
    setSchemaJsonError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(schemaJson);
    } catch {
      setSchemaJsonError('Schema JSON must be valid JSON');
      return;
    }
    const validated = schemaEditorSchema.safeParse(parsed);
    if (!validated.success) {
      setSchemaJsonError('Schema JSON does not match expected structure');
      return;
    }
    commitSchema(validated.data);
  };

  const handleReset = () => {
    commitSchema(schemaEditorSchema.parse(BASE_FLYER_SCHEMA));
  };

  const selectedImage: ImageSlot | null =
    selectedSlot?.type === 'image' ? schema.imageSlots.find((slot) => slot.id === selectedSlot.id) ?? null : null;
  const selectedText: TextSlot | null =
    selectedSlot?.type === 'text' ? schema.textSlots.find((slot) => slot.id === selectedSlot.id) ?? null : null;

  const slotHeader =
    selectedImage?.id ??
    selectedText?.id ??
    (schema.imageSlots.length + schema.textSlots.length > 0 ? 'Select a slot' : 'Add a slot');

  const updateSlotId = (nextId: string) => {
    const trimmed = nextId.trim();
    if (!trimmed) return;
    if (existingIds.has(trimmed) && trimmed !== selectedImage?.id && trimmed !== selectedText?.id) return;

    updateSchema((draft) => {
      if (selectedSlot?.type === 'image') {
        const slot = draft.imageSlots.find((s) => s.id === selectedSlot.id);
        if (!slot) return draft;
        slot.id = trimmed;
        return draft;
      }
      if (selectedSlot?.type === 'text') {
        const slot = draft.textSlots.find((s) => s.id === selectedSlot.id);
        if (!slot) return draft;
        slot.id = trimmed;
        return draft;
      }
      return draft;
    });

    if (selectedSlot) {
      setSelectedSlot({ ...selectedSlot, id: trimmed });
    }
  };

  const deleteSelected = () => {
    if (!selectedSlot) return;
    updateSchema((draft) => {
      if (selectedSlot.type === 'image') {
        draft.imageSlots = draft.imageSlots.filter((slot) => slot.id !== selectedSlot.id);
        return draft;
      }
      if (selectedSlot.type === 'text') {
        draft.textSlots = draft.textSlots.filter((slot) => slot.id !== selectedSlot.id);
        return draft;
      }
      return draft;
    });
    setSelectedSlot(null);
  };

  const addImageSlot = () => {
    const id = makeUniqueId('image', existingIds);
    updateSchema((draft) => {
      draft.imageSlots.push({ id, x: 36, y: 330, width: 240, height: 160, fit: 'cover' });
      return draft;
    });
    setSelectedSlot({ type: 'image', id });
  };

  const addTextSlot = () => {
    const id = makeUniqueId('text', existingIds);
    updateSchema((draft) => {
      draft.textSlots.push({ id, x: 36, y: 300, size: 12, maxWidth: 300, align: 'left' });
      return draft;
    });
    setSelectedSlot({ type: 'text', id });
  };

  const watermark = schema.watermark ?? { enabled: true, text: 'Hatch', opacity: 0.12, size: 42 };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addImageSlot} disabled={disabled}>
            Add image slot
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addTextSlot} disabled={disabled}>
            Add text slot
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={disabled}>
            Reset
          </Button>
        </div>

        <div className="rounded-xl border border-muted bg-muted/20 p-3">
          <div ref={canvasHostRef} className="w-full">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
              <div
                className="relative w-full overflow-hidden rounded-lg bg-white shadow-sm"
                style={{ height: canvasHeight, maxHeight: 560 }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />

                {schema.imageSlots.map((slot) => (
                  <DraggableSlot
                    key={`image:${slot.id}`}
                    dragId={`image:${slot.id}`}
                    label={`IMG:${slot.id}`}
                    disabled={disabled}
                    selected={selectedSlot?.type === 'image' && selectedSlot.id === slot.id}
                    onSelect={() => setSelectedSlot({ type: 'image', id: slot.id })}
                    style={{
                      left: slot.x * scale,
                      top: (page.height - slot.y - slot.height) * scale,
                      width: slot.width * scale,
                      height: slot.height * scale
                    }}
                  />
                ))}

                {schema.textSlots.map((slot) => (
                  <DraggableSlot
                    key={`text:${slot.id}`}
                    dragId={`text:${slot.id}`}
                    label={`TXT:${slot.id}`}
                    disabled={disabled}
                    selected={selectedSlot?.type === 'text' && selectedSlot.id === slot.id}
                    onSelect={() => setSelectedSlot({ type: 'text', id: slot.id })}
                    style={{
                      left: slot.x * scale,
                      top: (page.height - slot.y - 14) * scale,
                      width: Math.max(48, (slot.maxWidth ?? 120) * scale),
                      height: 18
                    }}
                  />
                ))}

                {watermark.enabled ? (
                  <div
                    className="pointer-events-none absolute flex items-center justify-center text-center font-bold text-slate-300/70"
                    style={{
                      left: (watermark.x ?? page.width / 2) * scale,
                      top: (page.height - (watermark.y ?? page.height / 2)) * scale,
                      transform: 'translate(-50%, -50%) rotate(-22deg)',
                      fontSize: (watermark.size ?? 42) * scale,
                      opacity: watermark.opacity ?? 0.12,
                      width: page.width * scale
                    }}
                  >
                    {watermark.text ?? 'Hatch'}
                  </div>
                ) : null}
              </div>
            </DndContext>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Schema JSON</p>
            <Button type="button" size="sm" variant="outline" onClick={handleApplyJson} disabled={disabled}>
              Apply JSON
            </Button>
          </div>
          <Textarea
            value={schemaJson}
            onChange={(event) => {
              setSchemaJson(event.target.value);
              setSchemaJsonDirty(true);
              setSchemaJsonError(null);
            }}
            className="min-h-[220px] font-mono text-xs"
            disabled={disabled}
          />
          {schemaJsonError ? <p className="text-xs text-destructive">{schemaJsonError}</p> : null}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-muted bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{slotHeader}</p>
          <Button type="button" size="sm" variant="destructive" onClick={deleteSelected} disabled={!selectedSlot || disabled}>
            Delete
          </Button>
        </div>

        {selectedSlot ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Slot ID</p>
              <Input
                value={selectedImage?.id ?? selectedText?.id ?? ''}
                onChange={(event) => updateSlotId(event.target.value)}
                disabled={disabled}
              />
            </div>

            {selectedImage ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">X</p>
                    <Input
                      type="number"
                      value={selectedImage.x}
                      onChange={(event) =>
                        updateSchema((draft) => {
                          const slot = draft.imageSlots.find((s) => s.id === selectedImage.id);
                          if (!slot) return draft;
                          slot.x = Number(event.target.value);
                          return draft;
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Y</p>
                    <Input
                      type="number"
                      value={selectedImage.y}
                      onChange={(event) =>
                        updateSchema((draft) => {
                          const slot = draft.imageSlots.find((s) => s.id === selectedImage.id);
                          if (!slot) return draft;
                          slot.y = Number(event.target.value);
                          return draft;
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Width</p>
                    <Input
                      type="number"
                      value={selectedImage.width}
                      onChange={(event) =>
                        updateSchema((draft) => {
                          const slot = draft.imageSlots.find((s) => s.id === selectedImage.id);
                          if (!slot) return draft;
                          slot.width = Number(event.target.value);
                          return draft;
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Height</p>
                    <Input
                      type="number"
                      value={selectedImage.height}
                      onChange={(event) =>
                        updateSchema((draft) => {
                          const slot = draft.imageSlots.find((s) => s.id === selectedImage.id);
                          if (!slot) return draft;
                          slot.height = Number(event.target.value);
                          return draft;
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Fit</p>
                  <Select
                    value={selectedImage.fit ?? 'cover'}
                    onValueChange={(value) =>
                      updateSchema((draft) => {
                        const slot = draft.imageSlots.find((s) => s.id === selectedImage.id);
                        if (!slot) return draft;
                        slot.fit = value as 'cover' | 'contain';
                        return draft;
                      })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cover</SelectItem>
                      <SelectItem value="contain">Contain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            {selectedText ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">X</p>
                    <Input
                      type="number"
                      value={selectedText.x}
                      onChange={(event) =>
                        updateSchema((draft) => {
                          const slot = draft.textSlots.find((s) => s.id === selectedText.id);
                          if (!slot) return draft;
                          slot.x = Number(event.target.value);
                          return draft;
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Y</p>
                    <Input
                      type="number"
                      value={selectedText.y}
                      onChange={(event) =>
                        updateSchema((draft) => {
                          const slot = draft.textSlots.find((s) => s.id === selectedText.id);
                          if (!slot) return draft;
                          slot.y = Number(event.target.value);
                          return draft;
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Size</p>
                    <Input
                      type="number"
                      value={selectedText.size ?? 12}
                      onChange={(event) =>
                        updateSchema((draft) => {
                          const slot = draft.textSlots.find((s) => s.id === selectedText.id);
                          if (!slot) return draft;
                          slot.size = Number(event.target.value);
                          return draft;
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Max width</p>
                    <Input
                      type="number"
                      value={selectedText.maxWidth ?? ''}
                      onChange={(event) =>
                        updateSchema((draft) => {
                          const slot = draft.textSlots.find((s) => s.id === selectedText.id);
                          if (!slot) return draft;
                          const num = Number(event.target.value);
                          slot.maxWidth = Number.isFinite(num) && num > 0 ? num : undefined;
                          return draft;
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Align</p>
                  <Select
                    value={selectedText.align ?? 'left'}
                    onValueChange={(value) =>
                      updateSchema((draft) => {
                        const slot = draft.textSlots.find((s) => s.id === selectedText.id);
                        if (!slot) return draft;
                        slot.align = value as 'left' | 'center' | 'right';
                        return draft;
                      })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a slot on the canvas to edit its properties.</p>
        )}
      </div>
    </div>
  );
}

