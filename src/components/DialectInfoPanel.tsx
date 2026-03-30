import { DIALECTS, type DialectId } from "@/lib/dialect-prompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Mic, Languages, Type } from "lucide-react";

interface Props {
  dialect: DialectId;
}

const DialectInfoPanel = ({ dialect }: Props) => {
  const info = DIALECTS.find((d) => d.id === dialect);
  if (!info) return null;

  const sections = [
    { icon: Mic, title: "Fonetske osobine", items: info.features.phonetic },
    { icon: Type, title: "Morfološke osobine", items: info.features.morphological },
    { icon: Languages, title: "Leksičke osobine", items: info.features.lexical },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{info.name}</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">{info.region} — {info.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="flex items-center gap-1.5 mb-2">
              <section.icon className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-sm font-semibold">{section.title}</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {section.items.map((item, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal whitespace-normal text-left">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DialectInfoPanel;
