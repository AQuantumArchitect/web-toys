import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ComingSoon from './ComingSoon.jsx';

createRoot(document.getElementById('root')).render(
  <ComingSoon name="Layer Roll" blurb="A three-layer pass-the-paper drawing game." />
);
