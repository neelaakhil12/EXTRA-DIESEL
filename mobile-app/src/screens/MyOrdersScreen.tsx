import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
  Modal,
  Image,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import { APP_CONFIG } from '../constants/config';

interface OrderItem {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  date: string;
  liters: number;
  total: number;
  fuelRate?: number;
  deliveryFee?: number;
  tax?: number;
  status: string;
  statusText?: string;
  address: string;
  slot?: string;
}

interface MyOrdersScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onSelectOrder: (orderId: string) => void;
  mode?: 'orders' | 'invoices';
  currentUser?: { name: string; email: string; phone?: string };
}

export const MyOrdersScreen: React.FC<MyOrdersScreenProps> = ({
  onNavigate,
  onSelectOrder,
  mode = 'orders',
  currentUser,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const isInvoiceMode = mode === 'invoices';

  const [tab, setTab] = useState<'all' | 'pending' | 'delivered'>('all');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<OrderItem | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';

  // Fetch real orders from backend
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const emailParam = currentUser?.email ? `email=${encodeURIComponent(currentUser.email)}` : 'all=true';
      const res = await fetch(`${baseUrl}/api/orders?${emailParam}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (e) {
      // Keep empty or fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentUser?.email]);

  const filteredOrders = orders.filter((o) => {
    if (tab === 'pending') return o.status === 'out_for_delivery' || o.status === 'pending' || o.status === 'assigned';
    if (tab === 'delivered') return o.status === 'delivered';
    return true;
  });

  // Short status badge helper to prevent overflowing out of the card
  const getStatusBadge = (status: string) => {
    if (status === 'delivered') {
      return { label: 'Delivered', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    }
    if (status === 'out_for_delivery') {
      return { label: 'Out for Delivery', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
    }
    if (status === 'assigned') {
      return { label: 'Bowser Assigned', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    }
    return { label: 'Pending Confirmation', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  };

  // Generate real PDF file on device using expo-print and share/download
  const handleDownloadPdf = async (order: OrderItem) => {
    try {
      setIsDownloading(true);

      // On Web: Trigger direct download via browser endpoint
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(`${baseUrl}/api/invoice/${order.id}/html?download=1`, '_blank');
        setIsDownloading(false);
        return;
      }

      const fuelTotal = (Number(order.liters) || 200) * (Number(order.fuelRate) || 94.50);
      const delFee = Number(order.deliveryFee) || 0;
      const taxAmt = Number(order.tax) || 0;
      const cgst = (taxAmt / 2).toFixed(2);
      const sgst = (taxAmt / 2).toFixed(2);
      const grandTotal = Number(order.total) || (fuelTotal + delFee + taxAmt);
      const customerName = order.name || currentUser?.name || 'Valued Customer';
      const customerPhone = order.phone || currentUser?.phone || '+91 9989551305';
      const customerEmail = order.email || currentUser?.email || 'customer@example.com';

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice #${order.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #FFFFFF; color: #0F172A; padding: 24px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #DC2626; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 900; color: #DC2626; }
    .brand-sub { font-size: 11px; color: #64748B; font-weight: 600; margin-top: 3px; }
    .brand-cert { font-size: 11px; color: #059669; font-weight: 700; margin-top: 3px; }
    .inv-meta { text-align: right; }
    .inv-title { font-size: 20px; font-weight: 900; color: #0F172A; }
    .inv-num { font-size: 14px; font-weight: 800; color: #DC2626; margin-top: 2px; }
    .inv-date { font-size: 12px; color: #64748B; margin-top: 2px; }
    .badge-paid { display: inline-block; background: #DCFCE7; color: #15803D; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; margin-top: 6px; }
    .parties { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; padding: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; }
    .party-col { flex: 1; }
    .party-lbl { font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
    .party-name { font-size: 14px; font-weight: 800; color: #0F172A; }
    .party-info { font-size: 12px; color: #475569; margin-top: 3px; line-height: 18px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; }
    .items-table th { background: #0F172A; color: #FFFFFF; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 12px 14px; text-align: left; }
    .items-table td { padding: 12px 14px; border-bottom: 1px solid #E2E8F0; font-size: 12.5px; }
    .items-table td.num { text-align: right; font-weight: 600; }
    .items-table th.num { text-align: right; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals-box { width: 320px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12.5px; color: #475569; }
    .total-row.grand { border-top: 2px solid #0F172A; padding-top: 10px; margin-top: 6px; font-size: 16px; font-weight: 900; color: #0F172A; }
    .total-row.grand .val { color: #DC2626; }
    .compliance { padding: 12px 14px; background: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 6px; font-size: 11px; color: #991B1B; line-height: 16px; margin-bottom: 24px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 16px; border-top: 1px dashed #CBD5E1; }
    .footer-note { font-size: 11px; color: #94A3B8; line-height: 16px; }
    .sign-stamp { text-align: right; font-size: 12px; font-weight: 800; color: #0F172A; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">🔥 EXTRA DIESEL</div>
      <div class="brand-sub">Aadhya Fuels & Infra • Doorstep Fueling Bowser Fleet</div>
      <div class="brand-cert">✓ Legal Metrology Certified (Weights & Measures)</div>
    </div>
    <div class="inv-meta">
      <div class="inv-title">TAX INVOICE</div>
      <div class="inv-num">#INV-${order.id}</div>
      <div class="inv-date">Date: ${order.date || new Date().toLocaleDateString('en-GB')}</div>
      <div class="badge-paid">✓ PAID VIA RAZORPAY</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-col">
      <div class="party-lbl">Supplier / Seller Details</div>
      <div class="party-name">Aadhya Fuels & Infra</div>
      <div class="party-info"><strong>GSTIN:</strong> 36AAACE1234F1Z5</div>
      <div class="party-info">Plot 42, Hitech City, Hyderabad, Telangana - 500081</div>
      <div class="party-info"><strong>Hotline:</strong> +91 9989551305 | support@extradiesel.in</div>
    </div>
    <div class="party-col">
      <div class="party-lbl">Billed & Delivered To</div>
      <div class="party-name">${customerName}</div>
      <div class="party-info"><strong>Phone:</strong> ${customerPhone}</div>
      <div class="party-info"><strong>Email:</strong> ${customerEmail}</div>
      <div class="party-info"><strong>Site:</strong> ${order.address}</div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Description of Goods / Services</th>
        <th>HSN / SAC</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Taxable Amt</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>
          <strong>High Speed BS-VI Diesel (HSD)</strong><br>
          <span style="font-size: 11px; color: #64748B;">Automated calibrated bowser digital dispensing</span>
        </td>
        <td>27101951</td>
        <td class="num">${order.liters} Liters</td>
        <td class="num">₹${(Number(order.fuelRate) || 94.50).toFixed(2)}</td>
        <td class="num">₹${fuelTotal.toFixed(2)}</td>
      </tr>
      ${delFee > 0 ? `
      <tr>
        <td>2</td>
        <td><strong>Doorstep Bowser Transport & Fuel Dispensing</strong></td>
        <td>996511</td>
        <td class="num">1 Delivery</td>
        <td class="num">₹${delFee.toFixed(2)}</td>
        <td class="num">₹${delFee.toFixed(2)}</td>
      </tr>` : ''}
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="total-row">
        <span>Subtotal (Taxable Value):</span>
        <span style="font-weight: 700;">₹${(fuelTotal + delFee).toFixed(2)}</span>
      </div>
      ${taxAmt > 0 ? `
      <div class="total-row">
        <span>CGST (2.5%):</span>
        <span>₹${cgst}</span>
      </div>
      <div class="total-row">
        <span>SGST (2.5%):</span>
        <span>₹${sgst}</span>
      </div>` : ''}
      <div class="total-row grand">
        <span>Total Amount Payable:</span>
        <span class="val">₹${grandTotal.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="compliance">
    <strong>Legal Metrology & Quality Declaration:</strong> Fuel dispensed with micro-filtered flow meters certified by the Department of Legal Metrology (Weights & Measures). Density BS-VI verified (820-845 kg/m³).
  </div>

  <div class="footer">
    <div class="footer-note">
      <div><strong>Payment Mode:</strong> Razorpay Online Prepaid (UPI / Cards / NetBanking)</div>
      <div style="margin-top: 4px;">This is a computer-generated tax invoice and requires no physical signature.</div>
    </div>
    <div class="sign-stamp">
      <div>For AADHYA FUELS & INFRA</div>
      <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Authorized Signatory</div>
    </div>
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Download Extra Diesel Invoice #${order.id}`,
        });
      } else {
        Alert.alert('Invoice PDF Generated', `PDF generated successfully.`);
      }
    } catch (err: any) {
      console.warn('PDF download error:', err);
      const invoiceUrl = `${baseUrl}/api/invoice/${order.id}/html?download=1`;
      Linking.openURL(invoiceUrl).catch(() => {
        Alert.alert('Notice', 'Could not open invoice.');
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: 1000, width: '100%', alignSelf: 'center', paddingVertical: 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Mode Sub-banner */}
      <View style={styles.pageBanner}>
        <View style={styles.bannerLeft}>
          <Ionicons
            name={isInvoiceMode ? 'receipt' : 'cube'}
            size={22}
            color={COLORS.primary}
          />
          <View>
            <Text style={styles.bannerTitle}>
              {isInvoiceMode ? 'Tax Invoices & GST Receipts' : 'Fuel Order History'}
            </Text>
            <Text style={styles.bannerSub}>
              {isInvoiceMode
                ? 'Download digitally signed 100% compliant GST bills'
                : 'Track ongoing bowser dispatches & view past fueling trips'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['all', 'pending', 'delivered'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabButton, tab === t && styles.tabButtonActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabButtonText, tab === t && styles.tabButtonTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading Indicator */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading {isInvoiceMode ? 'invoices' : 'orders'}...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name={isInvoiceMode ? 'document-text-outline' : 'receipt-outline'}
              size={42}
              color="#94A3B8"
            />
          </View>
          <Text style={styles.emptyTitle}>
            {isInvoiceMode ? 'No Invoices Found' : 'No Orders Found'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {tab === 'all'
              ? 'You have not placed any fuel orders yet. Order high-speed diesel delivered directly to your site!'
              : `No ${tab} orders at this moment.`}
          </Text>
          <TouchableOpacity
            style={styles.orderNowBtn}
            onPress={() => onNavigate('order')}
            activeOpacity={0.85}
          >
            <Ionicons name="funnel" size={17} color={COLORS.white} />
            <Text style={styles.orderNowBtnText}>Order Diesel Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Orders & Invoices List */
        filteredOrders.map((order) => {
          const isDelivered = order.status === 'delivered';
          const badge = getStatusBadge(order.status);

          return (
            <View key={order.id} style={styles.orderCard}>
              {/* Header: ID + Non-Overflowing Status Badge */}
              <View style={styles.orderCardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.orderIdText}>#{order.id}</Text>
                  <Text style={styles.orderDateText}>{order.date}</Text>
                </View>

                {/* Status Badge: Constrained so it never overflows */}
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: badge.bg, borderColor: badge.border },
                  ]}
                >
                  <Text
                    style={[styles.statusBadgeText, { color: badge.text }]}
                    numberOfLines={1}
                  >
                    {badge.label}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Volume & Price */}
              <View style={styles.detailsRow}>
                <View>
                  <Text style={styles.detailLabel}>Fuel Volume</Text>
                  <Text style={styles.detailValue}>{order.liters} Liters (BS-VI)</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailLabel}>Total Paid (Incl. GST)</Text>
                  <Text style={styles.totalValue}>₹{Number(order.total).toFixed(2)}</Text>
                </View>
              </View>

              {/* Delivery Address */}
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.muted} style={{ marginTop: 2 }} />
                <Text style={styles.addressText} numberOfLines={2}>
                  {order.address}
                </Text>
              </View>

              {/* Action Buttons: Track Bowser & Download Invoice */}
              <View style={styles.actionRow}>
                {/* Invoice Mode: Prominent Download Button */}
                {isInvoiceMode ? (
                  <TouchableOpacity
                    style={styles.downloadInvoiceBtn}
                    onPress={() => handleDownloadPdf(order)}
                    activeOpacity={0.85}
                    disabled={isDownloading}
                  >
                    <Ionicons name="download-outline" size={16} color={COLORS.white} />
                    <Text style={styles.downloadInvoiceBtnText}>
                      {isDownloading ? 'Generating PDF...' : 'Download Tax Invoice (PDF)'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  /* Orders Mode: Track Bowser + View Invoice side by side */
                  <>
                    <TouchableOpacity
                      style={styles.invoiceOutlineBtn}
                      onPress={() => setSelectedInvoice(order)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-text-outline" size={15} color="#0F172A" />
                      <Text style={styles.invoiceOutlineBtnText}>Invoice</Text>
                    </TouchableOpacity>

                    {!isDelivered ? (
                      <TouchableOpacity
                        style={styles.trackBtn}
                        onPress={() => {
                          onSelectOrder(order.id);
                          onNavigate('track');
                        }}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="navigate" size={15} color={COLORS.white} />
                        <Text style={styles.trackBtnText}>Track Bowser</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.deliveredPill}>
                        <Ionicons name="checkmark-done" size={14} color="#059669" />
                        <Text style={styles.deliveredPillText}>Delivered</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Interactive Invoice Modal (For instant in-app view / print) */}
      {selectedInvoice && (
        <Modal
          visible={!!selectedInvoice}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedInvoice(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.invoiceModalCard}>
              {/* Modal Top Bar */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Image
                    source={require('../../assets/images/logo.png')}
                    style={{ width: 28, height: 28, resizeMode: 'contain' }}
                  />
                  <Text style={styles.modalHeaderTitle}>TAX INVOICE</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedInvoice(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Brand Strip with Official Logo */}
                <View style={styles.invoiceBrandStrip}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image
                      source={require('../../assets/images/logo.png')}
                      style={{ width: 44, height: 44, resizeMode: 'contain' }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceBrandName}>EXTRA DIESEL</Text>
                      <Text style={styles.invoiceBrandSub}>Aadhya Fuels & Infra • GSTIN: 36AAACE1234F1Z5</Text>
                      <Text style={styles.invoiceCert}>✓ Legal Metrology Verified • W&M/HYD/2026/FM-4910</Text>
                    </View>
                  </View>
                </View>

                {/* Metadata */}
                <View style={styles.metaRow}>
                  <View>
                    <Text style={styles.metaLabel}>Invoice No:</Text>
                    <Text style={styles.metaVal}>#INV-{selectedInvoice.id}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.metaLabel}>Date:</Text>
                    <Text style={styles.metaVal}>{selectedInvoice.date}</Text>
                  </View>
                </View>

                {/* Customer Details */}
                <View style={styles.consigneeCard}>
                  <Text style={styles.consigneeTitle}>Billed & Delivered To:</Text>
                  <Text style={styles.consigneeName}>{selectedInvoice.name || currentUser?.name || 'Customer'}</Text>
                  <Text style={styles.consigneeText}>Phone: {selectedInvoice.phone || currentUser?.phone || '+91 9989551305'}</Text>
                  <Text style={styles.consigneeText}>Site: {selectedInvoice.address}</Text>
                </View>

                {/* Table */}
                <View style={styles.invoiceTable}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.thText, { flex: 2 }]}>Description</Text>
                    <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                    <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>Total</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.itemTitle}>BS-VI High Speed Diesel</Text>
                      <Text style={styles.itemSub}>HSN: 27101951 • Calibrated Bowser</Text>
                    </View>
                    <Text style={[styles.itemText, { flex: 1, textAlign: 'center' }]}>
                      {selectedInvoice.liters}L
                    </Text>
                    <Text style={[styles.itemText, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                      ₹{((Number(selectedInvoice.liters) || 200) * (Number(selectedInvoice.fuelRate) || 94.50)).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Grand Total */}
                <View style={styles.totalBox}>
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLineLabel}>Taxable Amount:</Text>
                    <Text style={styles.totalLineVal}>₹{(Number(selectedInvoice.total) * 0.95).toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLineLabel}>GST (5%):</Text>
                    <Text style={styles.totalLineVal}>₹{(Number(selectedInvoice.total) * 0.05).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.totalLine, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={[styles.totalLineLabel, { fontWeight: '900', color: '#0F172A', fontSize: 14 }]}>
                      Grand Total Paid:
                    </Text>
                    <Text style={[styles.totalLineVal, { fontWeight: '900', color: '#DC2626', fontSize: 16 }]}>
                      ₹{Number(selectedInvoice.total).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Paid Stamp */}
                <View style={styles.paidStamp}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text style={styles.paidStampText}>PAID ONLINE VIA RAZORPAY</Text>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalPrintBtn}
                  onPress={() => handleDownloadPdf(selectedInvoice)}
                  activeOpacity={0.85}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={17} color="#FFFFFF" />
                      <Text style={styles.modalPrintBtnText}>Download PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 95 : 85,
  },
  pageBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: COLORS.white,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  orderNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  orderNowBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  orderDateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '52%',
    flexShrink: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.dark,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#DC2626',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  trackBtnText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '800',
  },
  invoiceOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  invoiceOutlineBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  downloadInvoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 11,
    borderRadius: 10,
  },
  downloadInvoiceBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deliveredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deliveredPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  invoiceModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  modalBody: {
    padding: 18,
  },
  invoiceBrandStrip: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  invoiceBrandName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#DC2626',
  },
  invoiceBrandSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  invoiceCert: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '700',
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metaVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  consigneeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  consigneeTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  consigneeName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  consigneeText: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
  },
  invoiceTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    padding: 10,
  },
  thText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  itemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  itemText: {
    fontSize: 12,
    color: '#334155',
  },
  totalBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLineLabel: {
    fontSize: 12,
    color: '#475569',
  },
  totalLineVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  paidStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 8,
  },
  paidStampText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalPrintBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 11,
  },
  modalPrintBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
