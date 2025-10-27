import React from 'react';

const Configurations: React.FC = () => {
  return (
    <div className="page">
      <div className="page-header">
        <h2>SSH Configurations</h2>
        <button className="btn-primary">+ Add Configuration</button>
      </div>
      <p>SSH host configurations will be displayed here.</p>
    </div>
  );
};

export default Configurations;
