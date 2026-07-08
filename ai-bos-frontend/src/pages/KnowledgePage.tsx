import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, BookMarked, Sparkles, Eye, ThumbsUp, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getArticles } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { formatRelativeTime } from '@/lib/utils';

export function KnowledgePage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: articles } = useQuery({ queryKey: ['articles'], queryFn: getArticles });

  const filtered = (articles || []).filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase()));
  const selected = (articles || []).find((a) => a.id === selectedId);
  const categories = Array.from(new Set((articles || []).map((a) => a.category)));

  return (
    <div>
      <PageHeader title={t('nav.knowledge')} description="Base de connaissances et documentation" />
      {/* AI search */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary-50/50 to-violet-50/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-ai"><Sparkles className="h-4 w-4 text-white" /></div>
            <h3 className="text-sm font-semibold">Recherche IA</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Posez votre question..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Article list */}
        <div className="lg:col-span-1 space-y-2">
          <div className="relative mb-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          {filtered.map((a) => (
            <Card key={a.id} className={`cursor-pointer transition-all hover:shadow-elevated ${selected?.id === a.id ? 'border-primary' : ''}`} onClick={() => setSelectedId(a.id)}>
              <CardContent className="p-3">
                <Badge variant="muted" className="text-2xs mb-1">{a.category}</Badge>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{a.excerpt}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Article reader */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card>
              <CardContent className="p-6">
                <Badge variant="muted" className="mb-2">{selected.category}</Badge>
                <h1 className="text-xl font-bold">{selected.title}</h1>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Par {selected.author}</span><span>•</span><span>{formatRelativeTime(selected.updatedAt)}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{selected.views}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{selected.helpful}</span>
                </div>
                <div className="mt-4 prose prose-sm max-w-none">
                  <p className="text-sm text-foreground leading-relaxed">{selected.content}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{selected.excerpt} Cet article fournit des instructions détaillées étape par étape pour configurer et utiliser cette fonctionnalité efficacement. Suivez les étapes ci-dessous pour une configuration optimale.</p>
                  <h3 className="mt-4 text-base font-semibold">Étapes</h3>
                  <ol className="mt-2 list-decimal list-inside space-y-1 text-sm">
                    <li>Accédez aux paramètres depuis le menu latéral</li>
                    <li>Sélectionnez la section appropriée</li>
                    <li>Configurez les options selon vos besoins</li>
                    <li>Sauvegardez les modifications</li>
                  </ol>
                </div>
                <div className="mt-6 flex items-center gap-2 border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Cet article vous a-t-il aidé ?</span>
                  <Button variant="outline" size="sm"><ThumbsUp className="h-3.5 w-3.5" />Oui</Button>
                  <Button variant="outline" size="sm">Non</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-20"><BookMarked className="h-12 w-12 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Sélectionnez un article à lire</p></CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
