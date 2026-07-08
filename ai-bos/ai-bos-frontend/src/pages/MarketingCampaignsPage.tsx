import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Mail, Megaphone, Users, MousePointerClick, Target,
  DollarSign, Eye, Calendar, ArrowRight, Check,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { getCampaigns } from '@/lib/api/services';
import { useI18n } from '@/lib/i18n/store';
import { cn, formatCurrency, formatNumber, formatPercent, formatDate } from '@/lib/utils';

export function MarketingCampaignsPage() {
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const { data: campaigns } = useQuery({ queryKey: ['campaigns'], queryFn: getCampaigns });

  const totalReach = (campaigns || []).reduce((s, c) => s + c.reach, 0);
  const totalConversions = (campaigns || []).reduce((s, c) => s + c.conversions, 0);
  const totalBudget = (campaigns || []).reduce((s, c) => s + c.budget, 0);

  return (
    <div>
      <PageHeader
        title={t('nav.marketing')}
        description="Gérez vos campagnes marketing"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Nouvelle campagne</Button>}
      />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><p className="text-sm text-muted-foreground">Portée totale</p></div>
          <p className="mt-1 text-2xl font-bold">{formatNumber(totalReach)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-emerald-500" /><p className="text-sm text-muted-foreground">Conversions</p></div>
          <p className="mt-1 text-2xl font-bold">{formatNumber(totalConversions)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-amber-500" /><p className="text-sm text-muted-foreground">Budget total</p></div>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(totalBudget)}</p>
        </CardContent></Card>
      </div>

      {/* Campaign list */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(campaigns || []).map((c) => (
          <Card key={c.id} className="transition-all hover:shadow-elevated">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg',
                    c.type === 'email' && 'bg-primary-50 text-primary',
                    c.type === 'social' && 'bg-pink-50 text-pink-600',
                    c.type === 'sms' && 'bg-emerald-50 text-emerald-600',
                    c.type === 'webinar' && 'bg-amber-50 text-amber-600',
                  )}>
                    {c.type === 'email' && <Mail className="h-5 w-5" />}
                    {c.type === 'social' && <Megaphone className="h-5 w-5" />}
                    {c.type === 'sms' && <Mail className="h-5 w-5" />}
                    {c.type === 'webinar' && <Users className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{c.type}</p>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <div>
                  <p className="text-2xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />Portée</p>
                  <p className="text-sm font-semibold">{formatNumber(c.reach)}</p>
                </div>
                <div>
                  <p className="text-2xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Ouverture</p>
                  <p className="text-sm font-semibold">{formatPercent(c.openRate)}</p>
                </div>
                <div>
                  <p className="text-2xs text-muted-foreground flex items-center gap-1"><MousePointerClick className="h-3 w-3" />Clics</p>
                  <p className="text-sm font-semibold">{formatPercent(c.clickRate)}</p>
                </div>
                <div>
                  <p className="text-2xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" />Conv.</p>
                  <p className="text-sm font-semibold">{c.conversions}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(c.startDate)}</span>
                  <span>{formatCurrency(c.spent)} / {formatCurrency(c.budget)}</span>
                </div>
                <Button variant="outline" size="sm">Voir détails</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create wizard */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer une campagne</DialogTitle>
            <DialogDescription>Étape {wizardStep + 1} sur 3</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-4">
            {['Audience', 'Contenu', 'Planification'].map((step, i) => (
              <div key={i} className="flex items-center">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium',
                  i <= wizardStep ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {i < wizardStep ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < 2 && <div className={cn('mx-1 h-0.5 w-12', i < wizardStep ? 'bg-primary' : 'bg-muted')} />}
              </div>
            ))}
          </div>
          {wizardStep === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Sélectionnez votre audience cible</p>
              {['Tous les contacts', 'Clients actifs', 'Leads qualifiés', 'Clients inactifs'].map((a) => (
                <div key={a} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
                  <span className="text-sm">{a}</span>
                  <span className="text-xs text-muted-foreground">{Math.floor(Math.random() * 500)} contacts</span>
                </div>
              ))}
            </div>
          )}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Contenu de la campagne</p>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Aperçu email</p>
                <p className="text-sm font-semibold">Objet: Offre spéciale été 2024</p>
                <p className="mt-2 text-sm text-muted-foreground">Bonjour {`{prénom}`}, découvrez nos offres exclusives...</p>
              </div>
            </div>
          )}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Planification</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
                  <p className="text-sm font-medium">Envoyer maintenant</p>
                </div>
                <div className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
                  <p className="text-sm font-medium">Planifier</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {wizardStep > 0 && <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>Retour</Button>}
            <Button onClick={() => wizardStep < 2 ? setWizardStep(wizardStep + 1) : setCreateOpen(false)}>
              {wizardStep < 2 ? <>Suivant <ArrowRight className="h-4 w-4" /></> : 'Créer la campagne'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
