import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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
    
    // Filter out empty entries (especially the optional Wakame)
    const validEntries = entries.filter(entry => entry.amount && entry.amount.trim() !== "");
    
    if (validEntries.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in at least one delivery item",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Submit to backend
      console.log("ICA Delivery Data:", validEntries);
      
      toast({
        title: "Success",
        description: "ICA delivery order submitted successfully",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit ICA delivery order",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] max-h-[85vh] overflow-y-auto">
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
                  className="text-sm"
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
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                  <h3 className="font-medium text-sm text-gray-700">
                    Item {index + 1} {index === 4 && "(Optional)"}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Type */}
                    <div className="space-y-2">
                      <Label htmlFor={`type-${index}`}>Type</Label>
                      <Select
                        value={entry.type}
                        onValueChange={(value) => handleEntryChange(index, "type", value)}
                      >
                        <SelectTrigger id={`type-${index}`}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      />
                    </div>

                    {/* Time of Day */}
                    <div className="space-y-2">
                      <Label htmlFor={`time-${index}`}>Time of Day</Label>
                      <Select
                        value={entry.timeOfDay}
                        onValueChange={(value) => handleEntryChange(index, "timeOfDay", value)}
                      >
                        <SelectTrigger id={`time-${index}`}>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Submit Order
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
