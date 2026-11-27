export const Card = ({ className = '', children }) => (
  <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
)
