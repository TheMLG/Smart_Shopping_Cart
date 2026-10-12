import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Package,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Download,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Home,
} from "lucide-react";
import { TAX_RATE } from "@/types/cart";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderData {
  orderId: string;
  cartId: string;
  items: OrderItem[];
  totalAmount: number;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  paymentInfo: {
    method: string;
    status: string;
  };
  status: string;
  notes?: string;
  createdAt: string;
}

const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { toast } = useToast();

  const handleDownloadInvoice = async () => {
    if (!orderId) return;
    setDownloadingPDF(true);
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/download-bill`);
      if (!response.ok) throw new Error("Failed to download invoice");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice_${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: "Invoice saved successfully." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to download invoice. Please try again." });
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to fetch order");
        }

        setOrder(result.data);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError(err instanceof Error ? err.message : "Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading your invoice…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Error
            </CardTitle>
            <CardDescription>{error || "Order not found"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(order?.cartId ? `/cart/${order.cartId}` : "/")} className="w-full">
              <Home className="h-4 w-4 mr-2" /> Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Derived amounts
  const subtotal = order.totalAmount / (1 + TAX_RATE);
  const tax = order.totalAmount - subtotal;

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* ── Security Guard Alert ─────────────────────────────── */}
        <div className="flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600 p-4 shadow-sm">
          <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              Show this invoice to the security guard before exiting
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Your digital invoice serves as proof of purchase. Present it at the exit gate.
            </p>
          </div>
        </div>

        {/* ── Invoice Card (printable area) ─────────────────────── */}
        <div ref={invoiceRef}>
          {/* Header */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-primary-foreground">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Embedded Elite's Store</h1>
                  <p className="text-xs opacity-80 mt-0.5">Tax Invoice / Receipt</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-semibold">Bill Summary</span>
                  </div>
                  <p className="text-xs opacity-80">
                    {new Date(order.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap gap-x-8 gap-y-1 text-xs">
                <div>
                  <span className="opacity-70">Order No.</span>
                  <p className="font-mono font-semibold">{order.orderId}</p>
                </div>
                <div>
                  <span className="opacity-70">Payment Method</span>
                  <p className="capitalize font-medium">
                    {order.paymentInfo.method} •{" "}
                    <span className="bg-white/20 rounded px-1">{order.paymentInfo.status}</span>
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-0">
              {/* Customer Info */}
              <div className="px-6 py-4 border-b border-border grid sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{order.customerInfo.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium break-all">{order.customerInfo.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{order.customerInfo.phone}</p>
                  </div>
                </div>
              </div>

              {/* Items List — mobile-friendly card rows instead of a table */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Items</span>
                </div>

                {/* Header row — hidden on mobile, visible on sm+ */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 text-xs text-muted-foreground border-b border-border pb-2 mb-1 font-medium">
                  <span>Product</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Amount</span>
                </div>

                <div className="divide-y divide-border/50">
                  {order.items.map((item, i) => (
                    <div key={i} className="py-2.5">
                      {/* Mobile: 2-line layout */}
                      <div className="flex justify-between items-start gap-3 sm:hidden">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-tight">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ₹{item.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-semibold text-sm shrink-0">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      {/* Desktop: grid row layout */}
                      <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 text-sm items-center">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-center text-muted-foreground">{item.quantity}</span>
                        <span className="text-right text-muted-foreground">₹{item.price.toFixed(2)}</span>
                        <span className="text-right font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Price Breakdown</span>
                </div>
                <div className="space-y-2 text-sm max-w-xs ml-auto">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-medium text-foreground">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      GST / Tax{" "}
                      <span className="text-xs bg-muted rounded px-1">
                        {(TAX_RATE * 100).toFixed(0)}%
                      </span>
                    </span>
                    <span className="font-medium text-foreground">₹{tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total Paid</span>
                    <span className="text-primary">₹{order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* ── /Invoice ─────────────────────────────────────────── */}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(order.cartId ? `/cart/${order.cartId}` : "/")}
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Cart
          </Button>
          <Button
            variant="default"
            className="flex-1 bg-primary"
            onClick={handleDownloadInvoice}
            disabled={downloadingPDF}
          >
            {downloadingPDF ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Downloading...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Download Invoice</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
