

export { openWindow };

function openWindow( url: string )
{
  window.open(url, '_blank');
  window.focus();
}