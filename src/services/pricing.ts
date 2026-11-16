// Shared Pricing Calculation Service for Extra Diesel
// Ensures 100% calculation consistency between UI, Bottom Sheet, Razorpay, and Backend

export interface PricingBreakdown {
  productName: string;
  quantity: number;
  ratePerLiter: number;
  productValue: number;
  handlingFee: number;
  handlingFeeSlabLabel: string;
  gstRate: number;
  gstAmount: number;
  subtotal: number;
  grandTotal: number;
  totalPayable: number;
  formatted: {
    ratePerLiter: string;
    productValue: string;
    handlingFee: string;
    gstAmount: string;
    grandTotal: string;
    totalPayable: string;
  };
}

export const FUEL_RATE_PER_LITER = 104.47; // Matches reference screenshot rate
export const HANDLING_FEE_STANDARD = 499.00;
export const HANDLING_FEE_THRESHOLD = 500; // Free handling fee for bulk > 500L
export const GST_RATE = 0.18; // 18% GST on handling charges

/**
 * Format currency in Indian Rupee format (₹xx,xxx.xx)
 */
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Compute the complete order pricing breakdown
 */
export const calculateOrderPricing = (
  quantity: number,
  customRate?: number,
  productName = 'Diesel'
): PricingBreakdown => {
  const qty = Math.max(1, Number(quantity) || 1);
  const rate = customRate !== undefined && customRate > 0 ? customRate : FUEL_RATE_PER_LITER;

  // 1. Product Value = Rate * Quantity
  const productValue = Number((rate * qty).toFixed(2));

  // 2. Handling Fee based on slab (₹499 for up to 500L, ₹0 above 500L)
  const handlingFee = qty <= HANDLING_FEE_THRESHOLD ? HANDLING_FEE_STANDARD : 0;
  const handlingFeeSlabLabel = qty <= HANDLING_FEE_THRESHOLD ? 'Fuel Handling Fee (Up to 500)' : 'Fuel Handling Fee (Bulk Waived)';

  // 3. GST (18% on handling fee)
  const gstAmount = Number((handlingFee * GST_RATE).toFixed(2));

  // 4. Subtotal & Grand Total
  const grandTotal = Number((productValue + handlingFee + gstAmount).toFixed(2));
  const totalPayable = grandTotal;

  return {
    productName,
    quantity: qty,
    ratePerLiter: rate,
    productValue,
    handlingFee,
    handlingFeeSlabLabel,
    gstRate: 18,
    gstAmount,
    subtotal: productValue + handlingFee,
    grandTotal,
    totalPayable,
    formatted: {
      ratePerLiter: formatINR(rate),
      productValue: formatINR(productValue),
      handlingFee: formatINR(handlingFee),
      gstAmount: formatINR(gstAmount),
      grandTotal: formatINR(grandTotal),
      totalPayable: formatINR(totalPayable)
    }
  };
};
