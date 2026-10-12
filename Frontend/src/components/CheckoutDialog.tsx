import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartItem, TAX_RATE } from "@/types/cart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (customerInfo: CustomerInfo) => Promise<void>;
  isLoading?: boolean;
  cartItems: CartItem[];
  subtotal: number;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

const CheckoutDialog = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading = false,
  cartItems,
  subtotal 
}: CheckoutDialogProps) => {
  const [formData, setFormData] = useState<CustomerInfo>({
    name: "",
    email: "",
    phone: "",
  });

  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});
  
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleChange = (field: keyof CustomerInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] sm:max-w-[600px] max-h-[85dvh] flex flex-col p-0 rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Review your order and enter your details to view the bill summary.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-5 sm:px-6">
          <form onSubmit={handleSubmit} id="checkout-form">
            {/* Product List Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Your Items ({itemCount})</h3>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{item.image}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Order Summary Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-foreground">₹{tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Customer Information Section */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Customer Information</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    disabled={isLoading}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={isLoading}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    disabled={isLoading}
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>
        
        <DialogFooter className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="checkout-form"
            disabled={isLoading}
            className="flex-1 sm:flex-none min-w-[120px]"
          >
            {isLoading ? "Processing..." : "Proceed to Payout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
