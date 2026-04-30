import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { useGetAdminInvoice, getGetAdminInvoiceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminInvoiceDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = Number(params.id);

  const { data: invoice, isLoading } = useGetAdminInvoice(id);

  if (isLoading) return <div className="p-8 text-center">Loading invoice...</div>;
  if (!invoice) return <div className="p-8 text-center">Invoice not found</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/admin/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-serif font-bold text-primary">Invoice {invoice.invoiceNumber}</h1>
          <Badge variant="outline" className="uppercase">{invoice.status}</Badge>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>

      <Card className="border-border/50 bg-card overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
        <CardContent className="p-8 md:p-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between gap-8 pb-8 border-b border-border/50">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="Egypt Advocates Logo" className="w-12 h-12 object-contain" />
                <div>
                  <h2 className="text-2xl font-serif font-bold text-primary print:text-black">Egypt Advocates</h2>
                  <p className="text-sm text-muted-foreground print:text-gray-600">Law Firm & Legal Consultations</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground print:text-gray-600">
                <p>123 Legal Avenue, Maadi</p>
                <p>Cairo, Egypt</p>
                <p>info@egypt-advocates.com</p>
                <p>+20 100 123 4567</p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <h1 className="text-4xl font-serif font-bold text-primary/20 mb-4 print:text-gray-300">INVOICE</h1>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-right">
                <div className="font-medium">Invoice No:</div>
                <div className="font-mono">{invoice.invoiceNumber}</div>
                <div className="font-medium">Issue Date:</div>
                <div>{format(new Date(invoice.issueDate), "MMM d, yyyy")}</div>
                {invoice.dueDate && (
                  <>
                    <div className="font-medium">Due Date:</div>
                    <div>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="py-8 border-b border-border/50">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 print:text-gray-500">Bill To</h3>
            <p className="text-lg font-serif font-medium">{invoice.clientName}</p>
            {/* If we had client address fetched here, we'd display it. */}
          </div>

          {/* Items */}
          <div className="py-8">
            <Table className="print:text-black">
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="w-2/3">Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-end">Unit Price</TableHead>
                  <TableHead className="text-end">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.length > 0 ? invoice.items.map((item, i) => (
                  <TableRow key={i} className="border-border/30">
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-end">{item.unitPriceEgp.toLocaleString()} EGP</TableCell>
                    <TableCell className="text-end">{(item.quantity * item.unitPriceEgp).toLocaleString()} EGP</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">No items defined.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-4 pb-8">
            <div className="w-full md:w-1/2 lg:w-1/3">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-muted-foreground">Subtotal:</div>
                <div className="text-right font-medium">{invoice.subtotal.toLocaleString()} EGP</div>
                <div className="text-muted-foreground">Tax ({((invoice.tax / invoice.subtotal)*100).toFixed(0)}%):</div>
                <div className="text-right font-medium">{invoice.tax.toLocaleString()} EGP</div>
                <div className="text-lg font-bold border-t border-border pt-3 mt-1">Total:</div>
                <div className="text-lg font-bold border-t border-border pt-3 mt-1 text-right">{invoice.total.toLocaleString()} EGP</div>
              </div>
            </div>
          </div>

          {/* Footer / Notes */}
          {(invoice.notes || invoice.status === 'paid') && (
            <div className="mt-8 pt-8 border-t border-border/50 text-sm text-muted-foreground">
              {invoice.status === 'paid' && (
                <div className="mb-4 inline-flex items-center justify-center border-2 border-emerald-600 text-emerald-600 font-bold uppercase tracking-widest px-4 py-2 rounded transform -rotate-6 opacity-80 print:opacity-100">
                  PAID IN FULL
                </div>
              )}
              {invoice.notes && (
                <div>
                  <h4 className="font-semibold mb-1 text-foreground print:text-black">Notes</h4>
                  <p>{invoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
