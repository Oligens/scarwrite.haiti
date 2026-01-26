import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getShareholders, saveShareholders, getCompanyProfile, saveCompanyProfile } from '@/lib/storage';
import type { FC } from 'react';
import type { CompanyProfile } from '@/lib/database';

export const ShareholderManager: FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Array<{ id?: string; name: string; percentage: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [initialCapital, setInitialCapital] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const s = await getShareholders();
      setRows(s.length ? s.map(sh => ({ id: sh.id, name: sh.name, percentage: sh.percentage })) : [{ name: '', percentage: 100 }]);
      const profile = await getCompanyProfile();
      setInitialCapital((profile as CompanyProfile | null)?.initial_capital ?? 0);
      setLoading(false);
    };
    load();
  }, []);

  const addRow = () => setRows(r => [...r, { name: '', percentage: 0 }]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: 'name' | 'percentage', value: string | number) => {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: field === 'percentage' ? Number(value) : value } : row));
  };

  const total = rows.reduce((s, r) => s + (Number(r.percentage) || 0), 0);
  const valid = rows.length > 0 && Math.round(total) === 100 && rows.every(r => r.name.trim() !== '');

  const handleSave = async () => {
    try {
      if (!valid) {
        toast({ title: 'La somme des parts doit être 100% et tous les noms remplis', variant: 'destructive' });
        return;
      }
      await saveShareholders(rows.map(r => ({ name: r.name, percentage: r.percentage })));
      // Save initial capital into company profile if present
      const profile = await getCompanyProfile();
      await saveCompanyProfile({ company_type: profile?.company_type || 'Entreprise Individuelle', company_name: profile?.company_name || 'Entreprise', fiscal_year_start: profile?.fiscal_year_start || 10, ...(initialCapital ? { initial_capital: initialCapital } : {}) });
      toast({ title: 'Actionnaires sauvegardés' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur sauvegarde', variant: 'destructive' });
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-card-foreground">Capital social initial (optionnel)</Label>
        <Input value={initialCapital || ''} onChange={(e) => setInitialCapital(Number(e.target.value || 0))} placeholder="0" />
        <p className="text-xs text-muted-foreground">Si défini, une écriture de constitution sera générée automatiquement lors de la sauvegarde.</p>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input className="flex-1 bg-muted border-border text-black font-bold" value={row.name} onChange={(e) => updateRow(i, 'name', e.target.value)} placeholder="Nom actionnaire" />
            <Input className="w-32 bg-muted border-border text-black font-bold" value={row.percentage} onChange={(e) => updateRow(i, 'percentage', e.target.value)} placeholder="% Part" />
            <Button variant="destructive" onClick={() => removeRow(i)}>Supprimer</Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={addRow}>Ajouter (+)</Button>
        <Button onClick={handleSave} disabled={!valid}>Enregistrer (Parts = 100%)</Button>
      </div>
    </div>
  );
};
