import { useEffect, useState } from "react";
import { Gauge, Settings, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeSelector } from "@/components/ThemeSelector";
import { AnimationModeMenu } from "@/components/story/AnimationModeMenu";
import { getStoryAnimationMode, setStoryAnimationMode, type StoryAnimationMode } from "@/lib/story/animation";
import { getStorySpeed, nextStorySpeed, setStorySpeed } from "@/lib/story/speed";
import { loadStorySound, saveStorySound } from "@/lib/story/sound";

export function MenuSettings({ story }: { story: boolean }) {
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<StoryAnimationMode>("normal");
  const [soundOn, setSoundOn] = useState(true);
  useEffect(() => {
    setSpeed(getStorySpeed());
    setMode(getStoryAnimationMode());
    setSoundOn(loadStorySound());
  }, []);

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="secondary" size="sm" className="h-10 px-2 text-sm sm:px-4">
        <Settings className="hidden sm:block" /> Settings
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      {story ? <>
        <DropdownMenuItem onSelect={event => {
          event.preventDefault();
          const next = nextStorySpeed(speed);
          setStorySpeed(next);
          setSpeed(next);
        }}><Gauge /> Animation speed: {speed}×</DropdownMenuItem>
        <AnimationModeMenu mode={mode} disabled={false} onChange={next => { setStoryAnimationMode(next); setMode(next); }} />
        <DropdownMenuItem onSelect={event => {
          event.preventDefault();
          saveStorySound(!soundOn);
          setSoundOn(!soundOn);
        }}>{soundOn ? <VolumeX /> : <Volume2 />}{soundOn ? "Mute sounds" : "Unmute sounds"}</DropdownMenuItem>
      </> : <ThemeSelector submenu />}
    </DropdownMenuContent>
  </DropdownMenu>;
}