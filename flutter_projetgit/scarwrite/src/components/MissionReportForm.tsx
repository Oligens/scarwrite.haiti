import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { addMissionReport } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface Props {
  date: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MissionReportForm({ date, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>('0');
  const [beneficiaries, setBeneficiaries] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addMissionReport({
        transfer_date: date,
        amount: parseFloat(amount) || 0,
        beneficiaries: parseInt(beneficiaries) || 0,
        notes,
      });
      toast({ title: 'Rapport enregistré' });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer le rapport', variant: 'destructive' });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Nouveau rapport de mission — {date}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-semibold text-white">Montant décaisser</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-background border-slate-400 text-white" />
          </div>

          <div>
            <Label className="font-semibold text-white">Nombre de bénéficiaires</Label>
            <Input value={beneficiaries} onChange={(e) => setBeneficiaries(e.target.value)} className="bg-background border-slate-400 text-white" />
          </div>

          <div>
            <Label className="font-semibold text-white">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-background border-slate-400 text-white" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} type="button">Annuler</Button>
            <Button type="submit" className="bg-emerald-500 text-white" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
