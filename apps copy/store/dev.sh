#!/bin/bash

# Script para iniciar o servidor de desenvolvimento com Hyperdrive local

export WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE_DB="postgresql://postgres:password@localhost:5432/mktplace_dev"

# Iniciar o servidor
pnpm dev 