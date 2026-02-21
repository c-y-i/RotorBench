import React from "react";
import "../styles/saved.css";

export default function ConfirmModal({ message, onConfirm, onCancel, busy = false }) {
    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-card">
                <div className="modal-body">
                    <div className="modal-icon">⚠️</div>
                    <div className="modal-message">{message}</div>
                </div>
                <div className="modal-actions">
                    <button className="action-btn order" onClick={onCancel} disabled={busy}>
                        Cancel
                    </button>
                    <button className="action-btn save" onClick={onConfirm} disabled={busy}>
                        {busy ? "Working…" : "Yes, delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
