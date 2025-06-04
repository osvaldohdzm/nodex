import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const can = canvasRef.current;
    if (!can) return;

    const ctx = can.getContext('2d');
    let animationFrameId;
    let pulseTimeoutId;

    // Get theme colors from CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const bgColorPrimary = computedStyle.getPropertyValue('--body-color').trim() || '#05080D';
    const accentHue = parseInt(computedStyle.getPropertyValue('--hue').trim(), 10) || 200;

    // Convert bgColorPrimary to RGB
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
    const maxParticles = 60;
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
      this.maxConnections = 3;

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
    const pulsePeriod = 1200;
    const particlesPerPulse = 2;

    function pulse() {
      if (particles.length < maxParticles) {
        const numToSpawn = Math.min(particlesPerPulse, maxParticles - particles.length);
        for (let i = 0; i < numToSpawn; i++) {
          // Spawn from edges or random
          const edge = Math.floor(Math.random() * 4);
          let startX, startY;
          switch(edge) {
            case 0: // Top
              startX = Math.random() * can.width;
              startY = 0 - particleBaseRadius * 5;
              break;
            case 1: // Right
              startX = can.width + particleBaseRadius * 5;
              startY = Math.random() * can.height;
              break;
            case 2: // Bottom
              startX = Math.random() * can.width;
              startY = can.height + particleBaseRadius * 5;
              break;
            case 3: // Left
              startX = 0 - particleBaseRadius * 5;
              startY = Math.random() * can.height;
              break;
            default:
              startX = can.width / 2;
              startY = can.height / 2;
          }
          const angleToCenter = Math.atan2(can.height / 2 - startY, can.width / 2 - startX);
          const speedMagnitude = particleBaseSpeed * (0.7 + Math.random() * 0.6);
          const currentHue = accentHue + (Math.random() * 30 - 15);
          const color = `hsl(${currentHue}, 100%, 60%)`;
          particles.push(
            new Particle(
              startX,
              startY,
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
      pulseTimeoutId = setTimeout(pulse, pulsePeriod + Math.random() * 800);
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
    for(let k=0; k < Math.min(15, maxParticles); k++) {
      const angle = Math.random() * Math.PI * 2;
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
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(pulseTimeoutId);
      particles.length = 0;
    };
  }, []);

  return <canvas id="loginBackgroundCanvas" ref={canvasRef} />;
};

export default AnimatedBackground;
