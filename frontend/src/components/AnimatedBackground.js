import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const can = canvasRef.current;
    if (!can) return;

    const ctx = can.getContext('2d');
    let animationFrameId;
    let pulseTimeoutId;
    
    // --- NUEVO: Objeto para guardar la posición del ratón ---
    const mouse = {
      x: undefined,
      y: undefined,
      radius: 120 // Área de efecto del ratón
    };

    // --- NUEVO: Listeners para el ratón ---
    const handleMouseMove = (event) => {
        mouse.x = event.clientX; // Usar clientX/Y para coordenadas de la ventana
        mouse.y = event.clientY;
    };
    const handleMouseOut = () => {
        mouse.x = undefined;
        mouse.y = undefined;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

    // Get theme colors from CSS variables (del archivo styles.css)
    const computedStyle = getComputedStyle(document.documentElement);
    const bgColorPrimary = computedStyle.getPropertyValue('--body-color').trim() || '#05080D';
    const accentHue = parseInt(computedStyle.getPropertyValue('--hue').trim(), 10) || 200;

    // Convert bgColorPrimary to RGB for the trail effect
    let bgR = 5, bgG = 8, bgB = 13;
    if (bgColorPrimary.startsWith('#')) {
      const hex = bgColorPrimary.substring(1);
      if (hex.length === 3) {
        bgR = parseInt(hex[0] + hex[0], 16);
        bgG = parseInt(hex[1] + hex[1], 16);
        bgB = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        bgR = parseInt(hex.substring(0, 2), 16);
        bgG = parseInt(hex.substring(2, 4), 16);
        bgB = parseInt(hex.substring(4, 6), 16);
      }
    }
    const trailColor = `rgba(${bgR}, ${bgG}, ${bgB}, 0.15)`;
    const particleTrailColor = `rgba(${bgR}, ${bgG}, ${bgB}, 0.07)`;

    can.width = window.innerWidth;
    can.height = window.innerHeight;

    const particles = [];
    // --- MODIFICADO: Aumentamos el número de partículas ---
    const maxParticles = 120; // Antes era 60
    const connectionDistance = 150;
    const particleBaseRadius = 1.5;

    function drawBackgroundEffect() {
      ctx.fillStyle = trailColor;
      ctx.fillRect(0, 0, can.width, can.height);
      ctx.fillStyle = particleTrailColor;
      ctx.fillRect(0, 0, can.width, can.height);
    }

    function Particle(x, y, speed, color, radius) {
      this.x = x;
      this.y = y;
      this.vx = speed.x;
      this.vy = speed.y;
      this.color = color;
      this.radius = radius;
      this.initialLife = Math.random() * 150 + 150;
      this.life = this.initialLife;
      this.connections = 0;
      this.maxConnections = 4; // Un poco más de conexiones

      this.draw = function () {
        const currentRadius = this.radius * (this.life / this.initialLife);
        if (currentRadius < 0.5) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2, false);
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      };

      this.update = function () {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.5;

        // --- NUEVO: Interacción con el ratón (efecto de repulsión) ---
        if (mouse.x !== undefined && mouse.y !== undefined) {
            const dxMouse = this.x - mouse.x;
            const dyMouse = this.y - mouse.y;
            const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            if (distanceMouse < mouse.radius) {
                const forceDirectionX = dxMouse / distanceMouse;
                const forceDirectionY = dyMouse / distanceMouse;
                const force = (mouse.radius - distanceMouse) / mouse.radius;
                const directionX = forceDirectionX * force * 0.5; // Ajusta la fuerza de repulsión
                const directionY = forceDirectionY * force * 0.5;
                this.x += directionX;
                this.y += directionY;
            }
        }

        // Soft bounce
        if (this.x + this.radius > can.width || this.x - this.radius < 0) {
          this.vx *= -0.7;
          this.x = Math.max(this.radius, Math.min(can.width - this.radius, this.x));
        }
        if (this.y + this.radius > can.height || this.y - this.radius < 0) {
          this.vy *= -0.7;
          this.y = Math.max(this.radius, Math.min(can.height - this.radius, this.y));
        }
        // Gentle random direction change
        if (Math.random() < 0.02) {
          const angleChange = (Math.random() - 0.5) * (Math.PI / 4);
          const currentAngle = Math.atan2(this.vy, this.vx);
          const magnitude = Math.sqrt(this.vx ** 2 + this.vy ** 2) * (0.8 + Math.random() * 0.4);
          this.vx = Math.cos(currentAngle + angleChange) * magnitude;
          this.vy = Math.sin(currentAngle + angleChange) * magnitude;
        }
        // Limit speed
        const maxSpeed = 1.5;
        const currentSpeed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        if (currentSpeed > maxSpeed) {
          this.vx = (this.vx / currentSpeed) * maxSpeed;
          this.vy = (this.vy / currentSpeed) * maxSpeed;
        }
      };
    }

    function connectParticles() {
      particles.forEach(p => p.connections = 0);
      for (let i = 0; i < particles.length; i++) {
        // --- NUEVO: Conectar partículas con el ratón ---
        if (mouse.x !== undefined && mouse.y !== undefined) {
            const dx = particles[i].x - mouse.x;
            const dy = particles[i].y - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < connectionDistance * 1.2) { // Un poco más de rango para el ratón
                const opacity = Math.max(0, 1 - (distance / (connectionDistance * 1.2)));
                ctx.beginPath();
                ctx.strokeStyle = `hsla(${accentHue}, 100%, 70%, ${opacity * 0.5})`;
                ctx.lineWidth = 0.8;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }

        if (particles[i].connections >= particles[i].maxConnections) continue;
        for (let j = i + 1; j < particles.length; j++) {
          if (particles[j].connections >= particles[j].maxConnections) continue;
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < connectionDistance) {
            const opacity = Math.max(0, 1 - (distance / connectionDistance) * 0.8);
            ctx.beginPath();
            const connectionHue = accentHue;
            const connectionLightness = 60 + Math.random() * 10;
            ctx.strokeStyle = `hsla(${connectionHue}, 100%, ${connectionLightness}%, ${opacity * 0.4})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            particles[i].connections++;
            particles[j].connections++;
            if (particles[i].connections >= particles[i].maxConnections) break;
          }
        }
      }
    }

    const particleBaseSpeed = 0.5;
    // --- MODIFICADO: Generar partículas más rápido ---
    const pulsePeriod = 800; // Antes era 1200
    const particlesPerPulse = 4; // Antes era 2

    function pulse() {
      if (particles.length < maxParticles) {
        const numToSpawn = Math.min(particlesPerPulse, maxParticles - particles.length);
        for (let i = 0; i < numToSpawn; i++) {
          const edge = Math.floor(Math.random() * 4);
          let startX, startY;
          switch(edge) {
            case 0: startX = Math.random() * can.width; startY = 0 - particleBaseRadius * 5; break;
            case 1: startX = can.width + particleBaseRadius * 5; startY = Math.random() * can.height; break;
            case 2: startX = Math.random() * can.width; startY = can.height + particleBaseRadius * 5; break;
            case 3: startX = 0 - particleBaseRadius * 5; startY = Math.random() * can.height; break;
            default: startX = can.width / 2; startY = can.height / 2;
          }
          const angleToCenter = Math.atan2(can.height / 2 - startY, can.width / 2 - startX);
          const speedMagnitude = particleBaseSpeed * (0.7 + Math.random() * 0.6);
          const currentHue = accentHue + (Math.random() * 30 - 15);
          const color = `hsl(${currentHue}, 100%, 60%)`;
          particles.push(
            new Particle(
              startX, startY,
              {
                x: Math.cos(angleToCenter) * speedMagnitude + (Math.random() - 0.5) * 0.2,
                y: Math.sin(angleToCenter) * speedMagnitude + (Math.random() - 0.5) * 0.2,
              },
              color,
              particleBaseRadius + Math.random() * 2
            )
          );
        }
      }
      pulseTimeoutId = setTimeout(pulse, pulsePeriod + Math.random() * 500);
    }

    function gameMove() {
      drawBackgroundEffect();
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
          particles.splice(i, 1);
        }
      }
      connectParticles();
      animationFrameId = requestAnimationFrame(gameMove);
    }

    const handleResize = () => {
      can.width = window.innerWidth;
      can.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Inicializar con algunas partículas
    for(let k=0; k < Math.min(30, maxParticles); k++) { //--- Aumentamos las partículas iniciales
      const currentHue = accentHue + (Math.random() * 40 - 20);
      const color = `hsl(${currentHue}, 100%, 60%)`;
      particles.push(
        new Particle(
          can.width / 2 + (Math.random() - 0.5) * can.width * 0.5,
          can.height / 2 + (Math.random() - 0.5) * can.height * 0.5,
          {
            x: (Math.random() - 0.5) * particleBaseSpeed,
            y: (Math.random() - 0.5) * particleBaseSpeed,
          },
          color,
          particleBaseRadius + Math.random() * 1.5
        )
      );
    }

    pulse();
    gameMove();

    return () => {
      // --- Limpiar todos los listeners ---
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(pulseTimeoutId);
      particles.length = 0; // Vaciar el array para liberar memoria
    };
  }, []);

  // El canvas debe estar posicionado correctamente con CSS para cubrir el fondo
  return <canvas id="loginBackgroundCanvas" ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, width: '100vw', height: '100vh' }} />;
};

export default AnimatedBackground;
