import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { NornColors } from "@/theme";

export type HomeActivityVisual = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  accent: string;
  chipBg: string;
};

/** Map raw activity / short codes -> icon + accent for home timeline & chips. */
export function homeActivityVisual(raw: string): HomeActivityVisual {
  const k = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const kind =
    (
      {
        w: "walking",
        st: "standing",
        si: "sitting",
        r: "running",
        f: "falling",
        af: "after_fall",
        nf: "unstable_standing",
      } as Record<string, string>
    )[k] ?? k;

  const table: Record<string, HomeActivityVisual> = {
    walking: { icon: "directions-walk", accent: "#2563EB", chipBg: "bg-blue-50" },
    standing: { icon: "accessibility-new", accent: "#0D9488", chipBg: "bg-teal-50" },
    sitting: { icon: "weekend", accent: "#7C3AED", chipBg: "bg-violet-50" },
    running: { icon: "directions-run", accent: "#DC2626", chipBg: "bg-red-50" },
    falling: { icon: "personal-injury", accent: "#B45309", chipBg: "bg-amber-50" },
    after_fall: { icon: "medical-services", accent: "#C2410C", chipBg: "bg-orange-50" },
    unstable_standing: { icon: "balance", accent: "#CA8A04", chipBg: "bg-yellow-50" },
  };

  return (
    table[kind] ?? {
      icon: "motion-photos-on",
      accent: NornColors.brandOrange,
      chipBg: "bg-orange-50",
    }
  );
}
