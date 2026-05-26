#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager, State, WindowEvent,
};

// 应用状态：标记是否真正退出
struct AppState {
    is_quitting: Mutex<bool>,
}

// 获取数据目录路径
fn get_data_dir(app: &AppHandle) -> PathBuf {
    let data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    data_dir.join("data")
}

fn safe_data_file(filename: &str) -> Option<&'static str> {
    match filename {
        "stats.json" => Some("stats.json"),
        "N.json" => Some("N.json"),
        "config.json" => Some("config.json"),
        _ => None,
    }
}

// 确保数据目录存在
fn ensure_data_dir(app: &AppHandle) {
    let data_dir = get_data_dir(app);
    if !data_dir.exists() {
        let _ = fs::create_dir_all(&data_dir);
    }
}

// 加载数据命令
#[tauri::command]
fn load_data(app: AppHandle, filename: String) -> Option<serde_json::Value> {
    let filename = safe_data_file(&filename)?;
    let data_dir = get_data_dir(&app);
    let file_path = data_dir.join(filename);

    match fs::read_to_string(&file_path) {
        Ok(content) => serde_json::from_str(&content).ok(),
        Err(_) => None,
    }
}

// 保存数据命令
#[tauri::command]
fn save_data(app: AppHandle, filename: String, data: serde_json::Value) -> bool {
    let Some(filename) = safe_data_file(&filename) else {
        return false;
    };
    ensure_data_dir(&app);
    let data_dir = get_data_dir(&app);
    let file_path = data_dir.join(filename);

    match serde_json::to_string_pretty(&data) {
        Ok(content) => fs::write(&file_path, content).is_ok(),
        Err(_) => false,
    }
}

// 获取应用路径命令
#[tauri::command]
fn get_app_path(app: AppHandle) -> String {
    app.path()
        .resource_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| String::from("."))
}

// 设置系统托盘
fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // 创建托盘菜单
    let show_hide = MenuItem::with_id(app, "show_hide", "显示/隐藏", true, None::<&str>)?;
    let separator = MenuItem::with_id(app, "separator", "─────────", false, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_hide, &separator, &quit])?;

    // 加载图标
    let icon = Image::from_path("icons/icon.ico")
        .or_else(|_| Image::from_path("../icon.ico"))
        .unwrap_or_else(|_| Image::from_bytes(include_bytes!("../icons/icon.ico")).unwrap());

    // 创建托盘图标
    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .tooltip("Dual-N-Back")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
            "quit" => {
                if let Some(state) = app.try_state::<AppState>() {
                    *state.is_quitting.lock().unwrap() = true;
                }
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 第二个实例启动时，显示已运行的窗口
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(AppState {
            is_quitting: Mutex::new(false),
        })
        .setup(|app| {
            // 确保数据目录存在
            ensure_data_dir(&app.handle());

            // 设置系统托盘
            setup_tray(app)?;

            // 设置窗口关闭行为
            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        let state = app_handle.state::<AppState>();
                        let is_quitting = *state.is_quitting.lock().unwrap();

                        if !is_quitting {
                            // 不是真正退出，隐藏窗口
                            api.prevent_close();
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_data, save_data, get_app_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
