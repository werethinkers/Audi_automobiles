// src/components/ui/Badge.jsx
const variants = {
  green:  { bg: 'bg-green-100 text-green-800',   dot: 'bg-green-500'  },
  amber:  { bg: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500'  },
  red:    { bg: 'bg-red-100 text-red-800',       dot: 'bg-red-500'    },
  blue:   { bg: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500'   },
  purple: { bg: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500' },
  teal:   { bg: 'bg-teal-100 text-teal-800',     dot: 'bg-teal-500'   },
  gray:   { bg: 'bg-gray-100 text-gray-700',     dot: 'bg-gray-400'   },
  orange: { bg: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
}

export default function Badge({ children, variant = 'gray', showDot = true }) {
  const v = variants[variant] || variants.gray
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${v.bg}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${v.dot} flex-shrink-0`} />}
      {children}
    </span>
  )
}
