import { IonButton } from '@ionic/react';

interface Props {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

const EmptyState = ({ message, actionLabel, onAction }: Props) => (
  <div className="empty-state">
    <p>{message}</p>
    <IonButton onClick={onAction}>{actionLabel}</IonButton>
  </div>
);

export default EmptyState;
