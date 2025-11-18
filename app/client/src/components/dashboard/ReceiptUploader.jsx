import { useState } from 'react';

export default function ReceiptUploader({ transactionId, receiptUrl, uploadReceipt }) {
  const [busy, setBusy] = useState(false);

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await uploadReceipt(transactionId, file);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  return (
    <div className="receipt-uploader">
      {receiptUrl ? (
        <a className="link" href={receiptUrl} target="_blank" rel="noreferrer">
          View
        </a>
      ) : (
        <span className="muted">No file</span>
      )}
      <label className="link">
        {busy ? 'Uploading…' : 'Upload'}
        <input type="file" onChange={handleChange} style={{ display: 'none' }} accept="image/*,application/pdf" />
      </label>
    </div>
  );
}
