const Charts = (() => {
  const ANIMATION_SPEED = 0.05;

  function clearCanvas(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawPieChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return;

    let progress = 0;
    let currentAngle = -Math.PI / 2;

    function animate() {
      clearCanvas(ctx, canvas);
      ctx.scale(dpr, dpr);

      let angle = -Math.PI / 2;
      const progressAngle = progress * 2 * Math.PI;

      data.forEach((item, i) => {
        const sliceAngle = (item.count / total) * 2 * Math.PI;
        const endAngle = angle + Math.min(sliceAngle, progressAngle - (angle + Math.PI / 2 + Math.PI / 2));

        if (progressAngle > 0) {
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, angle, Math.max(angle, angle + sliceAngle * progress));
          ctx.closePath();
          ctx.fillStyle = item.color;
          ctx.fill();

          if (progress >= 1 && sliceAngle > 0.2) {
            const midAngle = angle + sliceAngle / 2;
            const labelRadius = radius * 0.65;
            const labelX = centerX + Math.cos(midAngle) * labelRadius;
            const labelY = centerY + Math.sin(midAngle) * labelRadius;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Segoe UI, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const label = item.count > total * 0.05 ? `${Math.round((item.count / total) * 100)}%` : '';
            if (label) {
              ctx.fillText(label, labelX, labelY);
            }
          }
        }

        angle += sliceAngle;
      });

      ctx.scale(1 / dpr, 1 / dpr);

      if (progress < 1) {
        progress += ANIMATION_SPEED;
        requestAnimationFrame(animate);
      }
    }

    animate();
  }

  function drawBarChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const padding = { top: 10, right: 10, bottom: 25, left: 30 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const windowIds = Object.keys(data);
    if (windowIds.length === 0) return;

    const maxCount = Math.max(...Object.values(data));
    const barWidth = Math.min(40, (chartWidth / windowIds.length) - 10);
    const gap = (chartWidth - barWidth * windowIds.length) / (windowIds.length + 1);

    let progress = 0;

    function animate() {
      clearCanvas(ctx, canvas);
      ctx.scale(dpr, dpr);

      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 1;

      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = '#718096';
        ctx.font = '10px Segoe UI, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxCount * (1 - i / 4)), padding.left - 5, y + 3);
      }

      windowIds.forEach((wid, i) => {
        const count = data[wid];
        const barHeight = (count / maxCount) * chartHeight * Math.min(progress, 1);
        const x = padding.left + gap + i * (barWidth + gap);
        const y = padding.top + chartHeight - barHeight;

        const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
        gradient.addColorStop(0, '#4f8cff');
        gradient.addColorStop(1, '#6c63ff');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();

        ctx.fillStyle = '#a0aec0';
        ctx.font = '10px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`W${i + 1}`, x + barWidth / 2, height - 8);

        ctx.fillStyle = '#eaeaea';
        ctx.font = 'bold 11px Segoe UI, sans-serif';
        ctx.fillText(count, x + barWidth / 2, y - 6);
      });

      ctx.scale(1 / dpr, 1 / dpr);

      if (progress < 1) {
        progress += ANIMATION_SPEED * 1.5;
        requestAnimationFrame(animate);
      }
    }

    animate();
  }

  function drawTrendLine(canvas, data) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const padding = { top: 10, right: 10, bottom: 25, left: 35 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (data.length < 2) return;

    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal || 1;

    let progress = 0;

    function animate() {
      clearCanvas(ctx, canvas);
      ctx.scale(dpr, dpr);

      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 1;

      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = '#718096';
        ctx.font = '10px Segoe UI, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxVal - (range * i / 4)), padding.left - 5, y + 3);
      }

      const points = data.map((val, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((val - minVal) / range) * chartHeight
      }));

      const visibleCount = Math.floor(points.length * Math.min(progress, 1));
      if (visibleCount < 2) {
        ctx.scale(1 / dpr, 1 / dpr);
        if (progress < 1) {
          progress += ANIMATION_SPEED;
          requestAnimationFrame(animate);
        }
        return;
      }

      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, 'rgba(79, 140, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(79, 140, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartHeight);
      for (let i = 0; i < visibleCount; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(points[visibleCount - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < visibleCount; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = '#4f8cff';
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = 0; i < visibleCount; i++) {
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#4f8cff';
        ctx.fill();
        ctx.strokeStyle = '#1e2a4a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.scale(1 / dpr, 1 / dpr);

      if (progress < 1) {
        progress += ANIMATION_SPEED;
        requestAnimationFrame(animate);
      }
    }

    animate();
  }

  return {
    drawPieChart,
    drawBarChart,
    drawTrendLine
  };
})();