import { Sparkles } from "lucide-react";
import { DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import type { StoryAnimationMode } from "@/lib/story/animation";

export function AnimationModeMenu({ mode, onChange, disabled }: { mode: StoryAnimationMode; onChange: (mode: StoryAnimationMode) => void; disabled: boolean }) {
  return <DropdownMenuSub>
    <DropdownMenuSubTrigger disabled={disabled}><Sparkles /> Animations: {mode === "normal" ? "Normal" : "Reduced"}</DropdownMenuSubTrigger>
    <DropdownMenuSubContent>
      <DropdownMenuRadioGroup value={mode} onValueChange={value => { if (value === "normal" || value === "reduced") onChange(value); }}>
        <DropdownMenuRadioItem value="normal">Normal</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="reduced">Reduced</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuSubContent>
  </DropdownMenuSub>;
}