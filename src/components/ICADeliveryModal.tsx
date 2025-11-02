import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";

interface ICADeliveryEntry {
  type: string;
  amount: string;
  timeOfDay: string;
}

interface ICADeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_TAGS = [
  {
    label: "Morning : 5 / 5 / 1 / 1 / 4w",
    values: [
      { type: "Normal", amount: "5", timeOfDay: "Morning" },
      { type: "Combo", amount: "5", timeOfDay: "Morning" },
      { type: "Vegan", amount: "1", timeOfDay: "Morning" },
      { type: "Salmon Avocado", amount: "1", timeOfDay: "Morning" },
      { type: "Wakame", amount: "4", timeOfDay: "Morning" },
    ]
  },
  {
    label: "Afternoon : 5 / 5 / 1 / 1",
    values: [
      { type: "Normal", amount: "5", timeOfDay: "Afternoon" },
      { type: "Combo", amount: "5", timeOfDay: "Afternoon" },
      { type: "Vegan", amount: "1", timeOfDay: "Afternoon" },
      { type: "Salmon Avocado", amount: "1", timeOfDay: "Afternoon" },
      { type: "Wakame", amount: "", timeOfDay: "Afternoon" },
    ]
  },
  {
    label: "Morning : 10 / 10 / 1 / 1 / 4w",
    values: [
      { type: "Normal", amount: "10", timeOfDay: "Morning" },
      { type: "Combo", amount: "10", timeOfDay: "Morning" },
      { type: "Vegan", amount: "1", timeOfDay: "Morning" },
      { type: "Salmon Avocado", amount: "1", timeOfDay: "Morning" },
      { type: "Wakame", amount: "4", timeOfDay: "Morning" },
    ]
  },
  {
    label: "Afternoon : 5 / 5 / 1 / 1",
    values: [
      { type: "Normal", amount: "5", timeOfDay: "Afternoon" },
      { type: "Combo", amount: "5", timeOfDay: "Afternoon" },
      { type: "Vegan", amount: "1", timeOfDay: "Afternoon" },
      { type: "Salmon Avocado", amount: "1", timeOfDay: "Afternoon" },
      { type: "Wakame", amount: "", timeOfDay: "Afternoon" },
    ]
  },
];

const TYPES = ["Normal", "Combo", "Vegan", "Salmon Avocado", "Wakame"];

export function ICADeliveryModal({ open, onOpenChange }: ICADeliveryModalProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [entries, setEntries] = useState<ICADeliveryEntry[]>([
    { type: "Normal", amount: "", timeOfDay: "Morning" },
    { type: "Combo", amount: "", timeOfDay: "Morning" },
    { type: "Vegan", amount: "", timeOfDay: "Morning" },
    { type: "Salmon Avocado", amount: "", timeOfDay: "Morning" },
    { type: "Wakame", amount: "", timeOfDay: "Morning" },
  ]);

  const handlePresetClick = (preset: typeof PRESET_TAGS[0]) => {
    setEntries(preset.values);
  };

  const handleEntryChange = (index: number, field: keyof ICADeliveryEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one complete set is filled
    const hasCompleteSet = entries.some(entry => 
      entry.amount && entry.amount.trim() !== "" && entry.timeOfDay
    );
    
    if (!hasCompleteSet) {
      toast({
        title: "Error",
        description: "Please fill in at least one complete set",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    // Filter out empty entries
    const validEntries = entries.filter(entry => entry.amount && entry.amount.trim() !== "");
    
    try {
      const response = await apiClient.post('/ica-delivery', {
        userName: profile?.name || 'Unknown',
        entries: validEntries,
        submittedAt: new Date().toISOString()
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "ICA delivery order submitted successfully",
        });
        
        // Reset form
        setEntries([
          { type: "Normal", amount: "", timeOfDay: "Morning" },
          { type: "Combo", amount: "", timeOfDay: "Morning" },
          { type: "Vegan", amount: "", timeOfDay: "Morning" },
          { type: "Salmon Avocado", amount: "", timeOfDay: "Morning" },
          { type: "Wakame", amount: "", timeOfDay: "Morning" },
        ]);
        
        setShowConfirmation(false);
        onOpenChange(false);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit ICA delivery order",
        variant: "destructive",
      });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] max-h-[85vh] overflow-y-auto bg-gradient-to-br from-blue-50/90 via-purple-50/90 to-pink-50/90 backdrop-blur-md border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-2xl">ICA Delivery</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preset Tags */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((preset, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  onClick={() => handlePresetClick(preset)}
                  className="text-sm bg-white/50 hover:bg-white/80 backdrop-blur-sm"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6">
              {entries.map((entry, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-white/40 backdrop-blur-md border-white/30 shadow-lg">
                  <h3 className="font-medium text-sm text-gray-700">
                    Set {index + 1}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Type - Fixed, not editable */}
                    <div className="space-y-2">
                      <Label htmlFor={`type-${index}`}>Type</Label>
                      <Input
                        id={`type-${index}`}
                        value={entry.type}
                        disabled
                        className="bg-gray-100/50 backdrop-blur-sm"
                      />
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${index}`}>Amount</Label>
                      <Input
                        id={`amount-${index}`}
                        type="number"
                        min="0"
                        placeholder="Enter amount"
                        value={entry.amount}
                        onChange={(e) => handleEntryChange(index, "amount", e.target.value)}
                        className="bg-white/50 backdrop-blur-sm"
                      />
                    </div>

                    {/* Time of Day */}
                    <div className="space-y-2">
                      <Label htmlFor={`time-${index}`}>Time of Day</Label>
                      <Select
                        value={entry.timeOfDay}
                        onValueChange={(value) => handleEntryChange(index, "timeOfDay", value)}
                      >
                        <SelectTrigger id={`time-${index}`} className="bg-white/50 backdrop-blur-sm">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Afternoon">Afternoon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-white/50 backdrop-blur-sm">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Submit
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Confirm ICA Delivery Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You are about to submit the following order:
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            {entries.filter(e => e.amount && e.amount.trim() !== "").map((entry, index) => (
              <div key={index} className="text-sm">
                <strong>{entry.type}:</strong> {entry.amount} units - {entry.timeOfDay}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Submitted by: {profile?.name || 'Unknown'}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirmation(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSubmit} className="bg-green-600 hover:bg-green-700">
            Confirm & Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
