/**
 * Bộ mã nguồn Google Apps Script chuẩn cho 2 Datasheet data1 và data2
 * Tác giả & Bản quyền: Lê Hoà Hiệp - 0983.676.470
 */

export const APPS_SCRIPT_DATA1 = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT CHO SHEET DATA1 (CẤU HÌNH & NỘI DUNG ĐỀ THI)
 * Bản quyền: Lê Hoà Hiệp - 0983.676.470
 * =========================================================================
 * HƯỚNG DẪN CÀI ĐẶT TRÊN GOOGLE SHEETS DATA1:
 * 1. Mở Google Sheet chứa đề thi (data1).
 * 2. Chọn menu 'Tiện ích mở rộng' (Extensions) -> 'Apps Script'.
 * 3. Xoá mã mặc định và dán toàn bộ đoạn mã này vào.
 * 4. Nhấn nút 'Lưu' (biểu tượng đĩa mềm hoặc Ctrl+S).
 * 5. Nhấn nút 'Triển khai' (Deploy) -> 'Triển khai mới' (New deployment).
 * 6. Chọn loại: 'Ứng dụng web' (Web app).
 * 7. Mô tả: "API De Thi data1".
 * 8. Thực thi dưới dạng: "Tôi" (User me).
 * 9. Ai có quyền truy cập: "Bất kỳ ai" (Anyone).
 * 10. Nhấn 'Triển khai' -> Cấp quyền truy cập nếu được yêu cầu -> Sao chép 'URL ứng dụng web'.
 * 11. Dán URL vừa sao chép vào ô Cấu hình của ứng dụng "KIỂM TRA THƯỜNG XUYÊN".
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet(); // Hoặc ss.getSheetByName("data1");
    
    // 1. Đọc thông tin cấu hình kỳ thi ở Dòng 1
    // A1: Tên kỳ kiểm tra, B1: Môn, C1: Tên trường, D1: Thời gian làm bài (phút)
    var examName = sheet.getRange("A1").getValue() || "KIỂM TRA THƯỜNG XUYÊN";
    var subject = sheet.getRange("B1").getValue() || "TIN HỌC 6";
    var schoolName = sheet.getRange("C1").getValue() || "TRƯỜNG THCS VÕ VĂN KIỆT";
    var durationVal = sheet.getRange("D1").getValue();
    var durationMinutes = 15;
    if (typeof durationVal === 'number' && durationVal > 0) {
      durationMinutes = durationVal;
    } else if (typeof durationVal === 'string') {
      var match = durationVal.match(/\\d+/);
      if (match) durationMinutes = parseInt(match[0], 10);
    }

    var config = {
      schoolName: schoolName.toString().trim(),
      examName: examName.toString().trim(),
      subject: subject.toString().trim(),
      durationMinutes: durationMinutes,
      copyrightText: "Lê Hoà Hiệp - 0983.676.470"
    };

    // 2. Đọc danh sách câu hỏi từ Dòng 5 trở đi (Dòng 4 là tiêu đề)
    var lastRow = sheet.getLastRow();
    var questions = [];
    
    if (lastRow >= 5) {
      // Đọc 9 cột: A (Loại), B (Câu số), C (Nội dung), D (ĐA A), E (ĐA B), F (ĐA C), G (ĐA D), H (ĐA Đúng), I (Điểm)
      // Lưu ý: Cột H (ĐA Đúng) đối với câu Tự luận lưu dạng: đáp án 1 / đáp án 2 / ... (học sinh gõ 1 trong các đáp án đều chấm đúng)
      var range = sheet.getRange(5, 1, lastRow - 4, 9);
      var values = range.getValues();
      
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        var qType = (row[0] || "").toString().trim();
        var qOrder = row[1] || (i + 1);
        var qContent = (row[2] || "").toString().trim();
        
        // Bỏ qua dòng trống
        if (!qContent && !qType) continue;

        var optA = (row[3] !== undefined && row[3] !== null) ? row[3].toString().trim() : "";
        var optB = (row[4] !== undefined && row[4] !== null) ? row[4].toString().trim() : "";
        var optC = (row[5] !== undefined && row[5] !== null) ? row[5].toString().trim() : "";
        var optD = (row[6] !== undefined && row[6] !== null) ? row[6].toString().trim() : "";
        var correctAns = (row[7] !== undefined && row[7] !== null) ? row[7].toString().trim() : "";
        var pts = parseFloat(row[8]) || 1.0;

        var normalizedType = qType.toLowerCase().indexOf("tự luận") !== -1 ? "Tự luận" : "Trắc nghiệm 1 đáp án";

        questions.push({
          id: i + 1,
          orderNumber: qOrder,
          type: normalizedType,
          content: qContent,
          optionA: optA,
          optionB: optB,
          optionC: optC,
          optionD: optD,
          correctAnswer: correctAns,
          points: pts,
          category: normalizedType === "Tự luận" ? "Tự luận & Tính toán" : "Trắc nghiệm cơ bản"
        });
      }
    }

    var result = {
      status: "success",
      timestamp: new Date().toISOString(),
      config: config,
      totalQuestions: questions.length,
      questions: questions
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorResult = {
      status: "error",
      message: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("data1") || ss.getActiveSheet();

    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    // 1. Cập nhật thông tin kỳ thi ở Dòng 1
    // A1: Tên kỳ kiểm tra, B1: Môn, C1: Tên trường, D1: Thời gian làm bài (phút)
    if (data.config) {
      if (data.config.examName !== undefined) sheet.getRange("A1").setValue(data.config.examName);
      if (data.config.subject !== undefined) sheet.getRange("B1").setValue(data.config.subject);
      if (data.config.schoolName !== undefined) sheet.getRange("C1").setValue(data.config.schoolName);
      if (data.config.durationMinutes !== undefined) sheet.getRange("D1").setValue(Number(data.config.durationMinutes) || 15);
    }

    // 2. Cập nhật danh sách câu hỏi từ Dòng 5 trở đi
    if (data.questions && Array.isArray(data.questions)) {
      // Đảm bảo dòng tiêu đề dòng 4 luôn có định dạng chuẩn
      var headerVal = sheet.getRange("A4").getValue();
      if (!headerVal) {
        var hRange = sheet.getRange("A4:I4");
        hRange.setValues([["Loại", "Câu số", "Nội dung câu hỏi", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "Đáp án đúng", "Điểm"]]);
        hRange.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");
      }

      // Xoá toàn bộ nội dung câu hỏi cũ từ dòng 5 trở đi
      var lastRow = sheet.getLastRow();
      if (lastRow >= 5) {
        sheet.getRange(5, 1, lastRow - 4, 9).clearContent();
      }

      // Ghi các câu hỏi mới vào data1
      if (data.questions.length > 0) {
        var rows = [];
        for (var i = 0; i < data.questions.length; i++) {
          var q = data.questions[i];
          rows.push([
            q.type || "Trắc nghiệm 1 đáp án",
            q.orderNumber || (i + 1),
            q.content || "",
            q.optionA || "",
            q.optionB || "",
            q.optionC || "",
            q.optionD || "",
            q.correctAnswer || "",
            Number(q.points) || 1.0
          ]);
        }
        sheet.getRange(5, 1, rows.length, 9).setValues(rows);
      }
    }

    var successResult = {
      status: "success",
      message: "Đã lưu thành công nội dung đề thi vào data1!",
      totalQuestions: (data.questions && data.questions.length) || 0,
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(successResult))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;

export const APPS_SCRIPT_DATA2 = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT CHO SHEET DATA2 (LƯU KẾT QUẢ & BẢNG XẾP HẠNG HỌC SINH)
 * Bản quyền: Lê Hoà Hiệp - 0983.676.470
 * =========================================================================
 * CÁC CỘT TRONG SHEET DATA2:
 * Cột A: STT
 * Cột B: TÊN HỌC SINH
 * Cột C: LỚP
 * Cột D: TỔNG ĐIỂM
 * Cột E: ĐIỂM TỪNG CÂU (vd: 1:0.5 2:0.5 3:1... câu bỏ trống ghi 1:-)
 * Cột F: THỜI GIAN HS BẮT ĐẦU (vd: 8:00 04/09/2026)
 * Cột G: THỜI GIAN HS NỘP BÀI (vd: 8:15 04/09/2026)
 * Cột H: TỔNG THỜI GIAN (vd: 00:15)
 * Cột I: IP HỌC SINH (Cột 9 - IP thuê bao của thiết bị HS sử dụng, vd: 113.169.89.135)
 * =========================================================================
 * HƯỚNG DẪN CÀI ĐẶT TRÊN GOOGLE SHEETS DATA2:
 * 1. Mở Google Sheet lưu kết quả (data2).
 * 2. Chọn menu 'Tiện ích mở rộng' (Extensions) -> 'Apps Script'.
 * 3. Dán đoạn mã này vào.
 * 4. Nhấn 'Lưu' -> 'Triển khai' -> 'Triển khai mới' -> 'Ứng dụng web'.
 * 5. Ai có quyền truy cập: "Bất kỳ ai" (Anyone).
 * 6. Sao chép 'URL ứng dụng web' và dán vào ứng dụng!
 */

// Hàm nhận kết quả thi từ học sinh gửi lên
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Khóa tránh xung đột khi nhiều học sinh nộp cùng lúc

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet(); // Hoặc ss.getSheetByName("data2");
    
    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    var studentName = data.studentName || data.name || "Học sinh";
    var className = data.className || data.class || "6A";
    var totalScore = data.totalScore !== undefined ? Number(data.totalScore) : 0;
    var scoreString = data.scoreString || data.detailedScores || "";
    var startTime = data.startTime || "";
    var endTime = data.endTime || "";
    var totalDuration = data.totalDuration || "";
    var clientIp = data.ip || data.ipAddress || data.clientIp || data.ipHocSinh || "";

    // Tìm dòng kế tiếp cần ghi
    var lastRow = sheet.getLastRow();
    var nextRow = lastRow + 1;
    if (nextRow < 2) nextRow = 2; // Dòng 1 là tiêu đề

    // Tính STT
    var nextSTT = 1;
    if (lastRow >= 2) {
      var lastSTTVal = sheet.getRange(lastRow, 1).getValue();
      if (!isNaN(parseInt(lastSTTVal, 10))) {
        nextSTT = parseInt(lastSTTVal, 10) + 1;
      } else {
        nextSTT = lastRow;
      }
    }

    // Ghi các cột: A:STT, B:Học sinh, C:Lớp, D:Tổng điểm, E:Điểm từng câu, F:Bắt đầu, G:Nộp bài, H:Tổng thời gian, I:IP học sinh (Cột 9)
    sheet.getRange(nextRow, 1, 1, 9).setValues([[
      nextSTT,
      studentName,
      className,
      totalScore,
      scoreString,
      startTime,
      endTime,
      totalDuration,
      clientIp
    ]]);

    var response = {
      status: "success",
      message: "Đã lưu kết quả bài thi vào Google Sheet data2 thành công!",
      stt: nextSTT,
      row: nextRow,
      studentName: studentName,
      totalScore: totalScore,
      clientIp: clientIp
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// Hàm lấy danh sách kết quả học sinh đã nộp để hiển thị Bảng xếp hạng & Báo cáo
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), 9);
    
    var submissions = [];
    if (lastRow >= 2) {
      // Cột 9 trong sheet data2 là IP học sinh
      var ipColIdx = 8; // Mặc định cột 9 (chỉ số 8)
      for (var h = 0; h < headers.length; h++) {
        var hName = (headers[h] || "").toString().toLowerCase();
        if (hName.indexOf("ip") !== -1 || hName.indexOf("cột 9") !== -1 || hName.indexOf("cot 9") !== -1) {
          ipColIdx = h;
          break;
        }
      }

      var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (!row[1]) continue; // Bỏ qua dòng trống tên học sinh
        // Lấy IP học sinh từ cột 9 trong sheet data2
        var rawIp = "";
        if (row[8] !== undefined && row[8] !== null && String(row[8]).trim() !== "") {
          rawIp = String(row[8]).trim();
        } else if (row[ipColIdx] !== undefined && row[ipColIdx] !== null) {
          rawIp = String(row[ipColIdx]).trim();
        }
        submissions.push({
          stt: row[0] || (i + 1),
          studentName: row[1],
          className: row[2],
          totalScore: Number(row[3]) || 0,
          scoreString: row[4] || "",
          startTime: row[5] || "",
          endTime: row[6] || "",
          totalDuration: row[7] || "",
          ipAddress: rawIp
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: submissions.length,
      data: submissions
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export const APPS_SCRIPT_COMBINED = `/**
 * =========================================================================
 * ALL-IN-ONE GOOGLE APPS SCRIPT CHO CẢ 2 SHEET (DATA1 VÀ DATA2)
 * (Dành cho thầy/cô để cả 2 sheet 'data1' và 'data2' trong cùng 1 file Google Sheets)
 * Bản quyền: Lê Hoà Hiệp - 0983.676.470
 * =========================================================================
 */

function doGet(e) {
  var action = (e.parameter && e.parameter.action) || "getExam";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "getLeaderboard") {
    // Lấy bảng xếp hạng & kết quả từ sheet data2
    var sheet2 = ss.getSheetByName("data2") || ss.getActiveSheet();
    var lastRow = sheet2.getLastRow();
    var lastCol2 = Math.max(sheet2.getLastColumn(), 9);
    var list = [];
    if (lastRow >= 2) {
      // Cột 9 trong sheet data2 là IP học sinh
      var headers2 = sheet2.getRange(1, 1, 1, lastCol2).getValues()[0];
      var ipIdx2 = 8; // Mặc định cột 9 (chỉ số 8)
      for (var h2 = 0; h2 < headers2.length; h2++) {
        var hName2 = (headers2[h2] || "").toString().toLowerCase();
        if (hName2.indexOf("ip") !== -1 || hName2.indexOf("cột 9") !== -1 || hName2.indexOf("cot 9") !== -1) {
          ipIdx2 = h2;
          break;
        }
      }

      var rows = sheet2.getRange(2, 1, lastRow - 1, lastCol2).getValues();
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!r[1]) continue;
        // Lấy IP học sinh từ cột 9 trong sheet data2
        var rIp = "";
        if (r[8] !== undefined && r[8] !== null && String(r[8]).trim() !== "") {
          rIp = String(r[8]).trim();
        } else if (r[ipIdx2] !== undefined && r[ipIdx2] !== null) {
          rIp = String(r[ipIdx2]).trim();
        }
        list.push({
          stt: r[0], studentName: r[1], className: r[2],
          totalScore: Number(r[3]) || 0, scoreString: r[4],
          startTime: r[5], endTime: r[6], totalDuration: r[7],
          ipAddress: rIp
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: list }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Mặc định lấy đề thi từ sheet data1
  var sheet1 = ss.getSheetByName("data1") || ss.getActiveSheet();
  var config = {
    schoolName: (sheet1.getRange("C1").getValue() || "TRƯỜNG THCS VÕ VĂN KIỆT").toString().trim(),
    examName: (sheet1.getRange("A1").getValue() || "KIỂM TRA THƯỜNG XUYÊN").toString().trim(),
    subject: (sheet1.getRange("B1").getValue() || "TIN HỌC 6").toString().trim(),
    durationMinutes: parseInt(sheet1.getRange("D1").getValue(), 10) || 15,
    copyrightText: "Lê Hoà Hiệp - 0983.676.470"
  };

  var lastR = sheet1.getLastRow();
  var qs = [];
  if (lastR >= 5) {
    var raw = sheet1.getRange(5, 1, lastR - 4, 9).getValues();
    for (var j = 0; j < raw.length; j++) {
      var row = raw[j];
      if (!row[2]) continue;
      var isTL = (row[0] || "").toString().toLowerCase().indexOf("tự luận") !== -1;
      qs.push({
        id: j + 1,
        orderNumber: row[1] || (j + 1),
        type: isTL ? "Tự luận" : "Trắc nghiệm 1 đáp án",
        content: (row[2] || "").toString().trim(),
        optionA: (row[3] || "").toString().trim(),
        optionB: (row[4] || "").toString().trim(),
        optionC: (row[5] || "").toString().trim(),
        optionD: (row[6] || "").toString().trim(),
        correctAnswer: (row[7] !== undefined ? row[7].toString().trim() : ""),
        points: parseFloat(row[8]) || 1.0,
        category: isTL ? "Tự luận & Tính toán" : "Trắc nghiệm cơ bản"
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "success", config: config, questions: qs }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {};
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(err) { data = e.parameter || {}; }
    } else {
      data = e.parameter || {};
    }

    // TRƯỜNG HỢP 1: Lưu / Thêm / Bớt / Chỉnh sửa đề thi vào sheet data1
    if (data.questions || data.action === "saveExam") {
      var sheet1 = ss.getSheetByName("data1") || ss.getActiveSheet();
      if (data.config) {
        if (data.config.examName !== undefined) sheet1.getRange("A1").setValue(data.config.examName);
        if (data.config.subject !== undefined) sheet1.getRange("B1").setValue(data.config.subject);
        if (data.config.schoolName !== undefined) sheet1.getRange("C1").setValue(data.config.schoolName);
        if (data.config.durationMinutes !== undefined) sheet1.getRange("D1").setValue(Number(data.config.durationMinutes) || 15);
      }

      if (data.questions && Array.isArray(data.questions)) {
        if (!sheet1.getRange("A4").getValue()) {
          var hR = sheet1.getRange("A4:I4");
          hR.setValues([["Loại", "Câu số", "Nội dung câu hỏi", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "Đáp án đúng", "Điểm"]]);
          hR.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");
        }
        var lastR1 = sheet1.getLastRow();
        if (lastR1 >= 5) {
          sheet1.getRange(5, 1, lastR1 - 4, 9).clearContent();
        }
        if (data.questions.length > 0) {
          var qRows = [];
          for (var k = 0; k < data.questions.length; k++) {
            var qItem = data.questions[k];
            qRows.push([
              qItem.type || "Trắc nghiệm 1 đáp án",
              qItem.orderNumber || (k + 1),
              qItem.content || "",
              qItem.optionA || "",
              qItem.optionB || "",
              qItem.optionC || "",
              qItem.optionD || "",
              qItem.correctAnswer || "",
              Number(qItem.points) || 1.0
            ]);
          }
          sheet1.getRange(5, 1, qRows.length, 9).setValues(qRows);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Đã lưu thành công nội dung đề thi vào data1!",
        totalQuestions: data.questions ? data.questions.length : 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // TRƯỜNG HỢP 2: Lưu kết quả nộp bài của học sinh vào sheet data2
    var sheet = ss.getSheetByName("data2") || ss.getActiveSheet();
    var lastRow = sheet.getLastRow();
    var nextRow = Math.max(lastRow + 1, 2);
    var nextSTT = 1;
    if (lastRow >= 2) {
      var prevSTT = parseInt(sheet.getRange(lastRow, 1).getValue(), 10);
      nextSTT = isNaN(prevSTT) ? lastRow : prevSTT + 1;
    }

    var clientIp = data.ip || data.ipAddress || data.clientIp || data.ipHocSinh || "";

    sheet.getRange(nextRow, 1, 1, 9).setValues([[
      nextSTT,
      data.studentName || "Học sinh",
      data.className || "6A",
      Number(data.totalScore) || 0,
      data.scoreString || "",
      data.startTime || "",
      data.endTime || "",
      data.totalDuration || "",
      clientIp
    ]]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", stt: nextSTT }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;
