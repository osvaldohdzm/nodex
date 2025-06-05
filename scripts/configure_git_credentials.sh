#!/bin/bash
set -euo pipefail

read -p "Introduce el host Git (por defecto: github.com): " git_host
git_host=${git_host:-github.com}

cred_file="$HOME/.git-credentials"
touch "$cred_file"

# Buscar credenciales para el host
existing_cred=$(grep -E "^https://[^:@]+:[^@]+@$git_host" "$cred_file" || true)

if [[ -n "$existing_cred" ]]; then
  echo "Ya hay credenciales guardadas para $git_host:"
  echo "$existing_cred"

  # Extraer usuario de las credenciales
  git_user=$(echo "$existing_cred" | sed -E 's|https://([^:]+):.*@.*|\1|')

  echo "Usuario git (de credenciales): $git_user"
else
  git_user=""
fi

# Validar usuario y token de credenciales
if [[ -z "$git_user" ]]; then
  read -p "Introduce tu nombre de usuario Git para $git_host: " git_user
fi

# Extraer token si existe (encred_file puede tener más líneas, pero tomamos la primera que coincide)
git_token=$(echo "$existing_cred" | sed -E 's|https://[^:]+:([^@]+)@.*|\1|' || true)

if [[ -z "$git_token" || "$git_token" == "$git_user" ]]; then
  read -sp "Introduce tu token de acceso personal (PAT) para $git_host: " git_token
  echo
fi

# Guardar o actualizar credenciales
cred_line="https://$git_user:$git_token@$git_host"

# Eliminar líneas antiguas para este usuario y host
grep -v -E "^https://$git_user:.*@$git_host" "$cred_file" > "$cred_file.tmp" || true
mv "$cred_file.tmp" "$cred_file"

echo "$cred_line" >> "$cred_file"
echo "Credenciales guardadas o actualizadas en $cred_file"

# Configurar helper para credenciales
git config --global credential.helper store

# Validar configuración global nombre y email
git_name=$(git config --global user.name || echo "")
git_email=$(git config --global user.email || echo "")

echo "Configuración git global actual:"
echo "Nombre: ${git_name:-(no configurado)}"
echo "Email: ${git_email:-(no configurado)}"

if [[ -z "$git_name" ]]; then
  read -p "Nombre para git config user.name (actual no configurado): " new_name
  if [[ -n "$new_name" ]]; then
    git config --global user.name "$new_name"
    echo "Nombre configurado."
  fi
else
  read -p "¿Quieres cambiar el nombre git global? (s/n): " change_name
  if [[ "$change_name" == "s" || "$change_name" == "S" ]]; then
    read -p "Nuevo nombre para git config user.name: " new_name
    if [[ -n "$new_name" ]]; then
      git config --global user.name "$new_name"
      echo "Nombre actualizado."
    fi
  fi
fi

if [[ -z "$git_email" ]]; then
  read -p "Email para git config user.email (actual no configurado): " new_email
  if [[ -n "$new_email" ]]; then
    git config --global user.email "$new_email"
    echo "Email configurado."
  fi
else
  read -p "¿Quieres cambiar el email git global? (s/n): " change_email
  if [[ "$change_email" == "s" || "$change_email" == "S" ]]; then
    read -p "Nuevo email para git config user.email: " new_email
    if [[ -n "$new_email" ]]; then
      git config --global user.email "$new_email"
      echo "Email actualizado."
    fi
  fi
fi

echo "Listo. Ahora Git usará esas credenciales para $git_host."
