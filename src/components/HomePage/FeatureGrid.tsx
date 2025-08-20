'use client';

import { modern2025Styles } from '@/styles/modern-2025';

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

interface FeatureGridProps {
  features: Feature[];
}

export default function FeatureGrid({ features }: FeatureGridProps) {
  const featureGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginTop: '40px',
  };

  const featureCardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    transition: 'transform 0.3s, box-shadow 0.3s',
  };

  const featureIconStyle: React.CSSProperties = {
    fontSize: '40px',
    marginBottom: '16px',
  };

  const featureTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    color: modern2025Styles.colors.text.primary,
  };

  const featureDescStyle: React.CSSProperties = {
    fontSize: '14px',
    color: modern2025Styles.colors.text.secondary,
    lineHeight: '1.6',
  };
  
  return (
    <div style={featureGridStyle}>
      {features.map((feature, index) => (
        <div 
          key={index}
          className="feature-card"
          style={{
            ...featureCardStyle,
            animation: `fadeIn 0.6s ease-out ${0.1 * index}s`,
            animationFillMode: 'both',
          }}
        >
          <div style={featureIconStyle}>{feature.icon}</div>
          <h3 style={featureTitleStyle}>{feature.title}</h3>
          <p style={featureDescStyle}>{feature.desc}</p>
        </div>
      ))}
    </div>
  );
}