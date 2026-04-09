import * as PopoverPrimitive from '@radix-ui/react-popover';

function Popover({ ...props }) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger({ ...props }) {
  return <PopoverPrimitive.Trigger {...props} />;
}

function PopoverContent({ className = '', align = 'center', sideOffset = 8, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={`z-[120] rounded-2xl border border-white/10 bg-neutral-900/95 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl outline-none ${className}`}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
