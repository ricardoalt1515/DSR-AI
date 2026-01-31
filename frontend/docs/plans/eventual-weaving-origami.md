# Debug Prompt: Scroll No Funciona en Combobox

Copia este prompt completo para otro LLM:

---

## PROBLEMA

Tengo un Combobox (Popover + Command de cmdk) que muestra 20 industrias agrupadas en 5 categorías. **El scroll no funciona** - el contenido se corta y no puedo ver los items de abajo.

## SCREENSHOT

El dropdown muestra ~6 items pero debería mostrar 20 con scroll. El contenido se corta sin scrollbar.

## INTENTOS FALLIDOS

1. ❌ Cambié `<div key={...}>` por `<Fragment key={...}>` para no romper estructura cmdk
2. ❌ Removí `h-full` y `overflow-hidden` del Command wrapper

## CÓDIGO ACTUAL

### compact-sector-select.tsx (uso del combobox)
```tsx
<Popover open={sectorOpen} onOpenChange={setSectorOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" ...>
      {selectedSectorConfig?.label || "Select industry..."}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
    <Command>
      <CommandInput placeholder="Search industries..." />
      <CommandList>
        <CommandEmpty>No industries found.</CommandEmpty>
        {groupKeys.map((groupKey, index) => (
          <Fragment key={groupKey}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={SECTOR_GROUPS[groupKey].label}>
              {getSectorsByGroup(groupKey).map((sectorConfig) => (
                <CommandItem key={sectorConfig.id} value={sectorConfig.label} onSelect={...}>
                  <Check className={cn("mr-2 h-4 w-4", sector === sectorConfig.id ? "opacity-100" : "opacity-0")} />
                  <Icon className="mr-2 h-4 w-4" />
                  {sectorConfig.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Fragment>
        ))}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

### command.tsx (componentes UI)
```tsx
const Command = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex w-full flex-col rounded-md bg-popover text-popover-foreground",
      className,
    )}
    {...props}
  />
));

const CommandList = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));

const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2...",
      className,
    )}
    {...props}
  />
));
```

### popover.tsx
```tsx
const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md...",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
```

## STACK

- cmdk (Command component)
- @radix-ui/react-popover
- Tailwind CSS
- Next.js 15 + React 19

## PREGUNTA

¿Por qué `CommandList` con `max-h-[300px] overflow-y-auto` no hace scroll? ¿Qué CSS está bloqueando el overflow? Dame el fix exacto.
