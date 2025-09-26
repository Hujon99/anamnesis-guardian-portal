/**
 * Store form component for creating and editing stores in the admin panel.
 * Provides a modal dialog with form fields for store information including
 * name, address, phone, and email with proper validation.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useStores } from "@/hooks/useStores";
import { Tables } from "@/integrations/supabase/types";

type Store = Tables<"stores">;

const storeSchema = z.object({
  name: z.string().min(1, "Namn är obligatoriskt").max(100, "Namn får vara max 100 tecken"),
  address: z.string().max(255, "Adress får vara max 255 tecken").optional().or(z.literal("")),
  phone: z.string().max(50, "Telefon får vara max 50 tecken").optional().or(z.literal("")),
  email: z.string().email("Ogiltig e-postadress").max(255, "E-post får vara max 255 tecken").optional().or(z.literal("")),
});

type StoreFormData = z.infer<typeof storeSchema>;

interface StoreFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store?: Store | null;
}

export const StoreForm = ({ open, onOpenChange, store }: StoreFormProps) => {
  const { createStore, updateStore } = useStores();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  // Reset and populate form when store changes
  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name,
        address: store.address || "",
        phone: store.phone || "",
        email: store.email || "",
      });
    } else {
      form.reset({
        name: "",
        address: "",
        phone: "",
        email: "",
      });
    }
  }, [store, form]);

  const onSubmit = async (data: StoreFormData) => {
    setIsSubmitting(true);
    
    try {
      if (store) {
        // Update existing store
        await updateStore({
          id: store.id,
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
        });
        toast({
          title: "Butik uppdaterad",
          description: "Butiken har uppdaterats framgångsrikt",
        });
      } else {
        // Create new store - include all required fields
        await createStore({
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          organization_id: "", // This will be overwritten by the mutation
          metadata: null,
          external_id: null,
        });
        toast({
          title: "Butik skapad",
          description: "Ny butik har skapats framgångsrikt",
        });
      }
      
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Fel uppstod",
        description: store ? "Kunde inte uppdatera butiken" : "Kunde inte skapa butiken",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {store ? "Redigera butik" : "Skapa ny butik"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Namn *</FormLabel>
                  <FormControl>
                    <Input placeholder="Butiksnamn" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adress</FormLabel>
                  <FormControl>
                    <Input placeholder="Gatuadress" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input placeholder="Telefonnummer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-post</FormLabel>
                  <FormControl>
                    <Input placeholder="E-postadress" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sparar..." : store ? "Uppdatera" : "Skapa"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};