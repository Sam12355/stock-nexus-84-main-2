import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ICADeliveryEntry {
  type: string;
  amount: string;
  timeOfDay: string;
  id?: number;
}

interface ExistingSubmission {
  id: number;
  type: string;
  amount: number;
  time_of_day: string;
  hours_since_submission: number;
}

interface ICADeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void; // Optional callback when submission succeeds
}

const PRESET_TAGS = [
  {
    label: "Morning : 5 / 5 / 1 / 1 / 4w",
    values: [
      { type: "Salmon and Rolls", amount: "5", timeOfDay: "Morning" },
      { type: "Combo", amount: "5", timeOfDay: "Morning" },
      { type: "Salmon and Avocado Rolls", amount: "1", timeOfDay: "Morning" },
      { type: "Vegan Combo", amount: "1", timeOfDay: "Morning" },
      { type: "Goma Wakame", amount: "4", timeOfDay: "Morning" },
    ]
  },
  {
    label: "Afternoon : 5 / 5 / 1 / 1w",
    values: [
      { type: "Salmon and Rolls", amount: "5", timeOfDay: "Afternoon" },
      { type: "Combo", amount: "5", timeOfDay: "Afternoon" },
      { type: "Salmon and Avocado Rolls", amount: "1", timeOfDay: "Afternoon" },
      { type: "Vegan Combo", amount: "1", timeOfDay: "Afternoon" },
      { type: "Goma Wakame", amount: "1", timeOfDay: "Afternoon" },
    ]
  },
  {
    label: "Morning : 10 / 10 / 1 / 1 / 4w",
    values: [
      { type: "Salmon and Rolls", amount: "10", timeOfDay: "Morning" },
      { type: "Combo", amount: "10", timeOfDay: "Morning" },
      { type: "Salmon and Avocado Rolls", amount: "1", timeOfDay: "Morning" },
      { type: "Vegan Combo", amount: "1", timeOfDay: "Morning" },
      { type: "Goma Wakame", amount: "4", timeOfDay: "Morning" },
    ]
  },
];

const TYPES = ["Salmon and Rolls", "Combo", "Salmon and Avocado Rolls", "Vegan Combo", "Goma Wakame"];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stock-nexus-84-main-2-1.onrender.com/api';

export function ICADeliveryModal({ open, onOpenChange, onSuccess }: ICADeliveryModalProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<ICADeliveryEntry[]>([
    { type: "Salmon and Rolls", amount: "", timeOfDay: "Morning" },
    { type: "Combo", amount: "", timeOfDay: "Morning" },
    { type: "Salmon and Avocado Rolls", amount: "", timeOfDay: "Morning" },
    { type: "Vegan Combo", amount: "", timeOfDay: "Morning" },
    { type: "Goma Wakame", amount: "", timeOfDay: "Morning" },
  ]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedDate(new Date());
      setEntries([
        { type: "Salmon and Rolls", amount: "", timeOfDay: "Morning" },
        { type: "Combo", amount: "", timeOfDay: "Morning" },
        { type: "Salmon and Avocado Rolls", amount: "", timeOfDay: "Morning" },
        { type: "Vegan Combo", amount: "", timeOfDay: "Morning" },
        { type: "Goma Wakame", amount: "", timeOfDay: "Morning" },
      ]);
    }
  }, [open]);

  const handlePresetClick = (preset: typeof PRESET_TAGS[0]) => {
    setEntries(preset.values);
  };

  const handleEntryChange = (index: number, field: keyof ICADeliveryEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    
    // If time of day changed, update all entries to match
    if (field === 'timeOfDay') {
      newEntries.forEach(entry => {
        entry.timeOfDay = value;
      });
    }
    
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
    
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Create new submission
      const response = await fetch(`${API_BASE_URL}/ica-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userName: profile?.name || 'Unknown',
          entries: validEntries,
          submittedAt: selectedDate.toISOString(),
          deliveryDate: selectedDate.toISOString().split('T')[0] // Send date in YYYY-MM-DD format
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "ICA delivery order submitted successfully",
        });
        
        // Call onSuccess callback to trigger refresh
        onSuccess?.();
      } else {
        console.error('Backend error:', data);
        if (data.duplicate) {
          toast({
            title: "Duplicate Submission",
            description: data.error,
            variant: "destructive",
          });
          setShowConfirmation(false);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to submit');
      }
        
      // Reset form
      setSelectedDate(new Date());
      setEntries([
        { type: "Salmon and Rolls", amount: "", timeOfDay: "Morning" },
        { type: "Combo", amount: "", timeOfDay: "Morning" },
        { type: "Salmon and Avocado Rolls", amount: "", timeOfDay: "Morning" },
        { type: "Vegan Combo", amount: "", timeOfDay: "Morning" },
        { type: "Goma Wakame", amount: "", timeOfDay: "Morning" },
      ]);
      setShowConfirmation(false);
      setLoading(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error('ICA Delivery error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit ICA delivery order",
        variant: "destructive",
      });
      setShowConfirmation(false);
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] max-h-[85vh] overflow-y-auto bg-white/10 backdrop-blur-2xl border border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">
            ICA Delivery
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preset Tags */}
          <div>
            <Label className="text-sm font-medium mb-2 block text-gray-200">Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map((preset, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    onClick={() => handlePresetClick(preset)}
                    className="text-sm bg-white/5 hover:bg-white/10 backdrop-blur-sm border-white/20 text-white hover:text-white"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Picker - Only for managers and assistant managers */}
            {profile && ['manager', 'assistant_manager'].includes(profile.role) && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-200">Delivery Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white/5 backdrop-blur-sm border-white/20 text-white hover:bg-white/10 hover:text-white",
                        !selectedDate && "text-gray-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-gray-900/95 backdrop-blur-md border-white/20" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      className="text-white"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-400">
                  Select the date for this ICA delivery. Defaults to today.
                </p>
              </div>
            )}
            
            <div className="grid gap-6">
              {entries.map((entry, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-white/5 backdrop-blur-md border-white/10 shadow-lg">
                  <h3 className="font-medium text-base text-white">
                    {entry.type}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Amount */}
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${index}`} className="text-gray-200">Amount</Label>
                      <Input
                        id={`amount-${index}`}
                        type="number"
                        min="0"
                        placeholder="Enter amount"
                        value={entry.amount}
                        onChange={(e) => handleEntryChange(index, "amount", e.target.value)}
                        className="bg-white/5 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-400"
                      />
                    </div>

                    {/* Time of the Day */}
                    <div className="space-y-2">
                      <Label htmlFor={`time-${index}`} className="text-gray-200">Time of the Day</Label>
                      <Select
                        value={entry.timeOfDay}
                        onValueChange={(value) => handleEntryChange(index, "timeOfDay", value)}
                      >
                        <SelectTrigger id={`time-${index}`} className="bg-white/5 backdrop-blur-sm border-white/20 text-white">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900/95 backdrop-blur-md border-white/20">
                          <SelectItem value="Morning" className="text-white hover:bg-white/10">Morning</SelectItem>
                          <SelectItem value="Afternoon" className="text-white hover:bg-white/10">Afternoon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-white/5 backdrop-blur-sm border-white/20 text-white hover:bg-white/10 hover:text-white" disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="max-w-md bg-white/20 backdrop-blur-xl border border-white/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Confirm ICA Delivery Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            You are about to submit the following order:
          </p>
          <div className="bg-white/10 border border-white/20 rounded-lg p-4 space-y-2">
            {profile && ['manager', 'assistant_manager'].includes(profile.role) && (
              <div className="text-sm text-gray-200 mb-3 pb-2 border-b border-white/20">
                <strong className="text-white">Delivery Date:</strong> {format(selectedDate, "PPP")}
              </div>
            )}
            {entries.filter(e => e.amount && e.amount.trim() !== "").map((entry, index) => (
              <div key={index} className="text-sm text-gray-200">
                <strong className="text-white">{entry.type}:</strong> {entry.amount} units - {entry.timeOfDay}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Submitted by: {profile?.name || 'Unknown'}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirmation(false)} className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSubmit} className="bg-green-600 hover:bg-green-700 text-white" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming...
              </span>
            ) : (
              'Confirm & Submit'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
