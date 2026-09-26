const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

// EclipseOS — brand mark (generated art; dark + light variants, picked by theme)
import React from 'react';
import { useOS } from '../store';
import { LOGO_URL, LOGO_URL_LIGHT } from '../defaults';

export default function Logo({ className, style, variant }) {
  const { state } = useOS();
  const dark = variant ? variant === 'dark' : state.settings.theme !== 'light';
  return <img src="https://media.db.com/images/public/6aada4652d1f7dcfe14104ba/9aefa77b2_Eclipseos-logo.png" alt="" className={className} style={style} />;
}