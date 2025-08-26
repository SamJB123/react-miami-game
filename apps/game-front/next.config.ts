import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  transpilePackages: ["@kixelated/hang", "@kixelated/moq", "@kixelated/signals"],
  experimental: {
    esmExternals: true
  },
  webpack: (config, { isServer }) => {
    // Support Vite-style worker URL imports used by @kixelated/hang
    config.module.rules.push({
      resourceQuery: /worker&url/,
      type: "asset/resource"
    });
    
    if (!isServer) {
      // Prevent bundling native Node addons in the client bundle
      // Specifically, avoid attempting to parse onnxruntime-node's .node binary
      // which causes "Unexpected character" parse errors during client build
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'onnxruntime-node': false,
        // Also prevent sharp from being bundled in client
        //'sharp': false,
      };
    }
    
    // On the server, mark onnxruntime-node as external so the native addon
    // is resolved at runtime by Node.js instead of being bundled
    if (isServer) {
      config.externals = [...(config.externals || []), 'onnxruntime-node'];
    }
    
    return config;
  }
};

export default nextConfig;
