# Goldridr UI Registry

Goldridr uses the shadcn `base-vega` style. The canonical component sources live in `src/components/ui`; generated registry artifacts live in `public/r`.

## Commands

```bash
npm run registry:validate
npm run registry:build
```

Run both commands after changing a custom registry primitive.

## Local installation

Start the app, then install an item through the `@goldridr` registry configured in `components.json`:

```bash
npx shadcn add @goldridr/super-field
```

Available items:

- `quill-editor`
- `calendar-input`
- `date-picker-input`
- `location-input`
- `searchable-select`
- `tags-input`
- `time-picker-input`
- `multi-select-input`
- `super-field`

`super-field` is the complete bundle. The other items can be installed independently.
