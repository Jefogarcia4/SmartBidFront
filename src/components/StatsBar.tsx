import { ClipboardList, Boxes, CircleDollarSign } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { money } from '../utils/format';

export function StatsBar() {
  const { totalItems, totalComponents, totalCOP } = useCart();

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <span className="stat-icon">
          <ClipboardList size={20} />
        </span>
        <div>
          <small>Total Items</small>
          <strong>{totalItems}</strong>
        </div>
      </div>
      <div className="stat-card">
        <span className="stat-icon">
          <Boxes size={20} />
        </span>
        <div>
          <small>Componentes</small>
          <strong>{totalComponents}</strong>
        </div>
      </div>
      <div className="stat-card highlight">
        <span className="stat-icon">
          <CircleDollarSign size={20} />
        </span>
        <div>
          <small>Costo Total (COP)</small>
          <strong>{money(totalCOP)}</strong>
        </div>
      </div>
    </div>
  );
}
