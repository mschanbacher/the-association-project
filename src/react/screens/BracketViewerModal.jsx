import React from 'react';
import { Modal, ModalBody } from '../components/Modal.jsx';

export function BracketViewerModal({ isOpen, data, onClose }) {
  if (!isOpen || !data) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={1400} zIndex={1400}>
      <ModalBody style={{ maxHeight: '85vh', overflowY: 'auto', padding: 0 }}>
        <div dangerouslySetInnerHTML={{ __html: data.html }} />
      </ModalBody>
    </Modal>
  );
}
