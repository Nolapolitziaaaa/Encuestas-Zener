export default function StatsCard({ label, value, icon: Icon, color = 'blue', subtext }) {
  const colorMap = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', value: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600', value: 'text-green-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600', value: 'text-red-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', value: 'text-yellow-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', value: 'text-purple-600' },
    primary: { bg: 'bg-primary-100', text: 'text-primary-600', value: 'text-primary-600' },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${colors.value}`}>{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
      </div>
    </div>
  );
}
