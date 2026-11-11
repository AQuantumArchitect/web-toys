import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ComingSoon from './ComingSoon.jsx';

createRoot(document.getElementById('root')).render(
  <ComingSoon name="Kid Lobber" blurb="Hammock-trebuchet physics, a simplified toy calculator." />
);
