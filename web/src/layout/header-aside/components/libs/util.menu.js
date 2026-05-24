function createMenuIcon (menu, titleSlot = false) {
  const slot = titleSlot ? { slot: 'title' } : {}
  if (menu.menuIssue) {
    return <i {...slot} class="fa fa-exclamation-triangle"/>
  }
  if (menu.icon) {
    return <i {...slot} class={ `fa fa-${menu.icon}` }/>
  }
  if (menu.iconSvg) {
    return <d2-icon-svg {...slot} name={ menu.iconSvg }/>
  }
  return <i {...slot} class={ titleSlot ? 'fa fa-folder-o' : 'fa fa-file-o' }/>
}

export function elMenuItem (h, menu) {
  void h
  const icon = createMenuIcon(menu)
  return <el-menu-item
    key={ menu.path }
    index={ menu.path }>
    { icon }
    <span slot="title">{ menu.title || '未命名菜单' }</span>
  </el-menu-item>
}

export function elSubmenu (h, menu) {
  void h
  const icon = createMenuIcon(menu, true)
  return <el-submenu
    key={ menu.path }
    index={ menu.path }>
    { icon }
    <span slot="title">{ menu.title || '未命名菜单' }</span>
    { menu.children.map(child => createMenu.call(this, h, child)) }
  </el-submenu>
}

export function createMenu (h, menu) {
  void h
  if (menu.children === undefined) return elMenuItem.call(this, h, menu)
  return elSubmenu.call(this, h, menu)
}
