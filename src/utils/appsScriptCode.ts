/**
 * Bộ mã nguồn Google Apps Script chuẩn cho Cơ sở dữ liệu data1 và data2
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
function removeAccents(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (t) {}

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("data2") || ss.getActiveSheet();
    
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = {};
      }
    }
    // Gộp cả e.parameter nếu có
    if (e && e.parameter) {
      for (var key in e.parameter) {
        if (data[key] === undefined || data[key] === null || data[key] === "") {
          data[key] = e.parameter[key];
        }
      }
    }

    var isUpdate = (
      data.action === "update" ||
      data.action === "edit" ||
      data.action === "regrade" ||
      data.isUpdate === true ||
      String(data.isUpdate) === "true" ||
      (e && e.parameter && (e.parameter.action === "update" || e.parameter.isUpdate === "true"))
    );

    var studentName = String(data.studentName || data.name || "Học sinh").trim();
    var className = String(data.className || data.class || "").trim();
    var totalScore = data.totalScore !== undefined ? Number(data.totalScore) : 0;
    var scoreString = String(data.scoreString || data.detailedScores || "");
    var startTime = data.startTime || "";
    var endTime = data.endTime || "";
    var totalDuration = data.totalDuration || "";
    var clientIp = data.ip || data.ipAddress || data.clientIp || data.ipHocSinh || "";

    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), 9);

    // 1. Tự động nhận diện cột từ dòng tiêu đề (Dòng 1)
    var headers = lastRow >= 1 ? (sheet.getRange(1, 1, 1, lastCol).getValues()[0] || []) : [];
    var sttColIdx = 0;        // Mặc định Cột A (0)
    var nameColIdx = 1;       // Mặc định Cột B (1)
    var classColIdx = 2;      // Mặc định Cột C (2)
    var scoreColIdx = 3;      // Mặc định Cột D (3)
    var detailColIdx = 4;     // Mặc định Cột E (4)
    var ipColIdx = 8;         // Mặc định Cột I (8)

    for (var h = 0; h < headers.length; h++) {
      var hText = removeAccents(String(headers[h] || ""));
      if (hText.indexOf("stt") !== -1 || hText === "so thu tu") sttColIdx = h;
      else if (hText.indexOf("ten") !== -1 || hText.indexOf("ho ten") !== -1 || hText.indexOf("hoc sinh") !== -1) nameColIdx = h;
      else if (hText.indexOf("lop") !== -1 || hText.indexOf("class") !== -1) classColIdx = h;
      else if (hText.indexOf("tong diem") !== -1 || hText === "diem" || hText.indexOf("score") !== -1) scoreColIdx = h;
      else if (hText.indexOf("diem tung cau") !== -1 || hText.indexOf("chi tiet") !== -1) detailColIdx = h;
      else if (hText.indexOf("ip") !== -1 || hText.indexOf("cot 9") !== -1) ipColIdx = h;
    }

    // Nhận diện các cột từng câu hỏi trong datasheet (VD: "Câu 1", "Câu 2", "C1", "C2", "Q1",...)
    var questionCols = {};
    for (var h = 0; h < headers.length; h++) {
      var rawH = String(headers[h] || "").trim();
      var cleanH = removeAccents(rawH).toLowerCase();
      if (h === sttColIdx || h === nameColIdx || h === classColIdx || h === scoreColIdx || h === ipColIdx) {
        continue;
      }
      var qMatch = cleanH.match(/^(?:cau|c|q)\s*(\d+)$/i);
      if (qMatch) {
        questionCols[parseInt(qMatch[1], 10)] = h;
      } else if (/^\d+$/.test(cleanH) && h >= 3) {
        questionCols[parseInt(cleanH, 10)] = h;
      }
    }

    var targetRow = -1;

    // 2. Tìm dòng học sinh nếu bảng đã có dữ liệu
    if (lastRow >= 2) {
      var allRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      var cleanTargetName = removeAccents(studentName);
      var cleanTargetClass = removeAccents(className);
      var rawTargetName = cleanTargetName.replace(/\s+/g, "");
      var rawTargetClass = cleanTargetClass.replace(/\s+/g, "");

      // Ưu tiên 1: Khớp chuẩn Họ tên + Lớp (khử dấu, không phân biệt hoa thường và khoảng trắng)
      if (rawTargetName) {
        for (var r = allRows.length - 1; r >= 0; r--) {
          var rName = removeAccents(String(allRows[r][nameColIdx] || ""));
          var rClass = removeAccents(String(allRows[r][classColIdx] || ""));
          var rRawName = rName.replace(/\s+/g, "");
          var rRawClass = rClass.replace(/\s+/g, "");

          var nameMatches = (rName === cleanTargetName) || (rRawName === rawTargetName) || (rRawName && rawTargetName && (rRawName.indexOf(rawTargetName) !== -1 || rawTargetName.indexOf(rRawName) !== -1));
          var classMatches = !rawTargetClass || !rRawClass || (rRawClass === rawTargetClass);

          if (nameMatches && classMatches) {
            targetRow = r + 2;
            break;
          }
        }
      }

      // Ưu tiên 2: Tìm theo STT nếu chưa tìm thấy bằng tên
      if (targetRow === -1 && data.stt !== undefined && data.stt !== null && String(data.stt).trim() !== "") {
        var targetSTT = parseInt(data.stt, 10);
        if (!isNaN(targetSTT) && targetSTT > 0) {
          for (var r = 0; r < allRows.length; r++) {
            var valSTT = parseInt(allRows[r][sttColIdx], 10);
            if (valSTT === targetSTT) {
              targetRow = r + 2;
              break;
            }
          }
        }
      }
    }

    // 3. NẾU LÀ YÊU CẦU SỬA ĐIỂM (isUpdate) HOẶC ĐÃ TÌM THẤY HỌC SINH CÓ SẴN:
    // TUYỆT ĐỐI THAY THẾ TRỰC TIẾP Ô ĐIỂM, KHÔNG TẠO THÊM DÒNG MỚI!
    if (isUpdate || targetRow >= 2) {
      if (targetRow === -1) {
        // Nếu lệnh sửa điểm không khớp chính xác tên, cập nhật dòng học sinh gần nhất (lastRow)
        targetRow = lastRow >= 2 ? lastRow : 2;
      }

      // A. Cập nhật số điểm tổng mới của học sinh vào đúng ô cột Tổng điểm
      if (scoreColIdx !== -1) {
        sheet.getRange(targetRow, scoreColIdx + 1).setValue(totalScore);
      }

      // B. Cập nhật chuỗi Điểm từng câu / Chi tiết nếu có
      if (detailColIdx !== -1 && scoreString) {
        sheet.getRange(targetRow, detailColIdx + 1).setValue(scoreString);
      }

      // C. CẬP NHẬT ĐIỂM MỚI CỦA CÂU ĐÓ VÀO ĐÚNG CỘT CÂU TƯƠNG ỨNG TRÊN DATASHEET
      var targetOrderNum = data.targetOrderNumber !== undefined ? parseInt(data.targetOrderNumber, 10) : (e && e.parameter && e.parameter.targetOrderNumber ? parseInt(e.parameter.targetOrderNumber, 10) : -1);
      var targetQScore = data.questionScore !== undefined ? Number(data.questionScore) : (e && e.parameter && e.parameter.questionScore !== undefined ? Number(e.parameter.questionScore) : null);

      if (targetOrderNum !== -1 && targetQScore !== null) {
        if (questionCols[targetOrderNum] !== undefined) {
          sheet.getRange(targetRow, questionCols[targetOrderNum] + 1).setValue(targetQScore);
        }
      }

      // D. Cập nhật tất cả các câu từ questionScores nếu có
      var qScores = data.questionScores;
      if (qScores && typeof qScores === "object") {
        for (var qKey in qScores) {
          var qN = parseInt(qKey, 10);
          if (!isNaN(qN) && questionCols[qN] !== undefined) {
            sheet.getRange(targetRow, questionCols[qN] + 1).setValue(qScores[qKey]);
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "updated",
        message: "Đã cập nhật điểm mới vào datasheet tại dòng " + targetRow + " thành công!",
        row: targetRow,
        studentName: studentName,
        totalScore: totalScore,
        targetOrderNumber: targetOrderNum,
        questionScore: targetQScore
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. CHỈ KHI LÀ BÀI NỘP MỚI LẦN ĐẦU (isUpdate = false và không trùng học sinh):
    var nextRow = lastRow + 1;
    if (nextRow < 2) nextRow = 2; // Dòng 1 là tiêu đề

    // Tính STT
    var nextSTT = 1;
    if (lastRow >= 2) {
      var lastSTTVal = sheet.getRange(lastRow, sttColIdx + 1).getValue();
      if (!isNaN(parseInt(lastSTTVal, 10))) {
        nextSTT = parseInt(lastSTTVal, 10) + 1;
      } else {
        nextSTT = lastRow;
      }
    }

    var newRowData = new Array(Math.max(lastCol, 9));
    for (var k = 0; k < newRowData.length; k++) newRowData[k] = "";
    newRowData[sttColIdx] = nextSTT;
    newRowData[nameColIdx] = studentName;
    newRowData[classColIdx] = className;
    newRowData[scoreColIdx] = totalScore;
    newRowData[detailColIdx] = scoreString;
    newRowData[5] = startTime;
    newRowData[6] = endTime;
    newRowData[7] = totalDuration;
    newRowData[ipColIdx] = clientIp;

    // Điền điểm từng câu vào các cột câu tương ứng nếu datasheet có cột câu
    if (data.questionScores && typeof data.questionScores === "object") {
      for (var qKey2 in data.questionScores) {
        var qN2 = parseInt(qKey2, 10);
        if (!isNaN(qN2) && questionCols[qN2] !== undefined && questionCols[qN2] < newRowData.length) {
          newRowData[questionCols[qN2]] = data.questionScores[qKey2];
        }
      }
    }

    sheet.getRange(nextRow, 1, 1, newRowData.length).setValues([newRowData]);

    var response = {
      status: "success",
      action: "inserted",
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
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "update" || action === "edit" || (e && e.parameter && (e.parameter.isUpdate === "true" || e.parameter.isUpdate === true))) {
    return doPost(e);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("data2") || ss.getActiveSheet();
    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), 9);
    
    var submissions = [];
    if (lastRow >= 2) {
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
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
 * BỘ MÃ GOOGLE APPS SCRIPT KẾT NỐI ĐỒNG THỜI CẢ 2 SHEET (DATA1 & DATA2)
 * (Dành cho thầy/cô để cả 2 trang tính 'data1' và 'data2' trong cùng 1 file Google Sheets)
 * Tác giả & Bản quyền: Lê Hoà Hiệp - 0983.676.470
 * =========================================================================
 * 
 * HƯỚNG DẪN CÀI ĐẶT NHANH (CHỈ CẦN THỰC HIỆN 1 LẦN):
 * 1. Mở file Google Sheets của thầy/cô (nên có sẵn 2 trang tính đặt tên là: data1 và data2).
 *    (Nếu chưa có, sau khi dán mã này và bấm F5 tải lại trang tính, sẽ có Menu "Kiểm Tra Thường Xuyên"
 *     để tự động tạo mẫu trang data1 và data2 chỉ với 1 cú click).
 * 2. Trên thanh menu Google Sheets, chọn: 'Tiện ích mở rộng' (Extensions) -> 'Apps Script'.
 * 3. Xoá hết mã cũ trong cửa sổ soạn thảo, DÁN TOÀN BỘ MÃ NÀY VÀO.
 * 4. Nhấn biểu tượng ĐĨA MỀM (hoặc phím Ctrl + S) để lưu dự án.
 * 5. Nhấn nút màu xanh: 'Triển khai' (Deploy) -> 'Triển khai mới' (New deployment).
 * 6. Bấm vào biểu tượng bánh răng 'Chọn loại' -> Chọn 'Ứng dụng web' (Web app).
 * 7. Cấu hình triển khai:
 *    - Mô tả: "API Ket Noi Data1 va Data2"
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me - địa chỉ email của thầy/cô)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone) -> RẤT QUAN TRỌNG!
 * 8. Nhấn 'Triển khai' (Deploy).
 *    - Bấm 'Ủy quyền truy cập' -> Chọn tài khoản Google của thầy/cô.
 *    - Bấm 'Nâng cao' (Advanced) -> Bấm 'Đi tới... (không an toàn)'.
 *    - Bấm 'Cho phép' (Allow).
 * 9. SAO CHÉP 'URL ứng dụng web' (có dạng https://script.google.com/macros/s/AKfycby.../exec).
 * 10. Dán URL này vào ứng dụng web KIỂM TRA THƯỜNG XUYÊN tại mục "Cài đặt Google Sheets".
 *     (Thầy/cô có thể dán cùng 1 URL này vào cả 2 ô Link Data1 và Link Data2).
 */

// =========================================================================
// 1. MENU TỰ ĐỘNG TẠO MẪU BẢNG TRÊN GOOGLE SHEETS
// =========================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Kiểm Tra Thường Xuyên")
    .addItem("1. Tạo mẫu sheet data1 (Đề thi & Cấu hình)", "setupData1Sheet")
    .addItem("2. Tạo mẫu sheet data2 (Kết quả & Cột từng câu)", "setupData2Sheet")
    .addSeparator()
    .addItem("3. Tạo tự động cả 2 sheet data1 & data2", "setupBothSheets")
    .addToUi();
}

function setupBothSheets() {
  setupData1Sheet();
  setupData2Sheet();
  SpreadsheetApp.getUi().alert("Đã khởi tạo thành công cả 2 sheet data1 và data2 theo đúng chuẩn!");
}

function setupData1Sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("data1");
  if (!sheet) {
    sheet = ss.insertSheet("data1");
  }

  // Dòng 1: Cấu hình kỳ thi (A1: Tên kỳ thi, B1: Môn, C1: Tên trường, D1: Thời gian phút)
  sheet.getRange("A1").setValue("KIỂM TRA THƯỜNG XUYÊN");
  sheet.getRange("B1").setValue("TIN HỌC 6");
  sheet.getRange("C1").setValue("TRƯỜNG THCS VÕ VĂN KIỆT");
  sheet.getRange("D1").setValue(15);
  sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#e0f2fe");

  // Dòng 2 & 3: Ghi chú hướng dẫn
  sheet.getRange("A2").setValue("Lưu ý: Dòng 1 là thông tin kỳ thi (A1: Tên kỳ kiểm tra, B1: Môn học, C1: Tên trường, D1: Thời gian làm bài phút). Dòng 4 là tiêu đề cột. Dòng 5 trở đi là danh sách câu hỏi.");
  sheet.getRange("A2:I2").merge().setFontStyle("italic").setFontColor("#64748b");

  // Dòng 4: Tiêu đề các cột đề thi
  var headers = [["Loại", "Câu số", "Nội dung câu hỏi", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "Đáp án đúng", "Điểm"]];
  var hRange = sheet.getRange("A4:I4");
  hRange.setValues(headers);
  hRange.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");

  // Câu hỏi mẫu từ dòng 5 nếu sheet còn trống
  if (sheet.getLastRow() < 5) {
    var sampleQuestions = [
      ["Trắc nghiệm 1 đáp án", 1, "Thiết bị nào sau đây là thiết bị vào của máy tính?", "Màn hình", "Bàn phím", "Máy in", "Loa", "B", 1],
      ["Trắc nghiệm 1 đáp án", 2, "1 Terabyte (TB) bằng bao nhiêu Gigabyte (GB)?", "1000", "1024", "2048", "512", "B", 1],
      ["Tự luận", 3, "Bộ nhớ máy tính lưu trữ thông tin dưới dạng các dãy số gồm 2 chữ số nào?", "", "", "", "", "0 và 1 / 0 va 1 / 0, 1 / nhị phân", 2]
    ];
    sheet.getRange(5, 1, sampleQuestions.length, 9).setValues(sampleQuestions);
  }

  sheet.autoResizeColumns(1, 9);
}

function setupData2Sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("data2");
  if (!sheet) {
    sheet = ss.insertSheet("data2");
  }

  // Tiêu đề chuẩn cột sheet data2: Cột 1 đến Cột 9 là thông tin chung, từ Cột 10 trở đi là các câu hỏi
  var headers = [
    "STT",
    "Họ và tên",
    "Lớp",
    "Tổng điểm",
    "Điểm từng câu",
    "Thời gian bắt đầu",
    "Thời gian nộp bài",
    "Thời gian làm bài",
    "IP học sinh (Cột 9)",
    "Câu 1", "Câu 2", "Câu 3", "Câu 4", "Câu 5",
    "Câu 6", "Câu 7", "Câu 8", "Câu 9", "Câu 10",
    "Câu 11", "Câu 12", "Câu 13", "Câu 14", "Câu 15",
    "Câu 16", "Câu 17", "Câu 18", "Câu 19", "Câu 20"
  ];

  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 9);
}

// =========================================================================
// 2. HÀM HỖ TRỢ XỬ LÝ CHUỖI TIẾNG VIỆT & TÌM KIẾM
// =========================================================================
function removeAccents(str) {
  if (!str) return "";
  var s = String(str).toLowerCase().trim();
  s = s.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
  s = s.replace(/[èéẹẻẽêềếệểễ]/g, "e");
  s = s.replace(/[ìíịỉĩ]/g, "i");
  s = s.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
  s = s.replace(/[ùúụủũưừứựửữ]/g, "u");
  s = s.replace(/[ỳýỵỷỹ]/g, "y");
  s = s.replace(/đ/g, "d");
  return s;
}

// =========================================================================
// 3. XỬ LÝ YÊU CẦU ĐỌC DỮ LIỆU (GET) TỪ ỨNG DỤNG WEB
// =========================================================================
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  var sheetParam = (e && e.parameter && e.parameter.sheet) || "";

  // Nếu là lệnh sửa điểm gửi qua phương thức GET (fallback an toàn cho trình duyệt)
  if (
    action === "update" ||
    action === "edit" ||
    (e && e.parameter && (e.parameter.isUpdate === "true" || e.parameter.isUpdate === true))
  ) {
    return doPost(e);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // TRƯỜNG HỢP A: LẤY BẢNG ĐIỂM & KẾT QUẢ THI CỦA HỌC SINH TỪ SHEET DATA2
  if (
    action === "getSubmissions" ||
    action === "getLeaderboard" ||
    action === "data2" ||
    sheetParam === "data2"
  ) {
    try {
      var sheet2 = ss.getSheetByName("data2") || ss.getActiveSheet();
      var lastRow2 = sheet2.getLastRow();
      var lastCol2 = Math.max(sheet2.getLastColumn(), 9);
      var submissions = [];

      if (lastRow2 >= 2) {
        var headers2 = sheet2.getRange(1, 1, 1, lastCol2).getValues()[0];
        var ipIdx2 = 8; // Mặc định Cột I (chỉ số 8) là IP học sinh
        for (var h2 = 0; h2 < headers2.length; h2++) {
          var hName2 = removeAccents(String(headers2[h2] || ""));
          if (hName2.indexOf("ip") !== -1 || hName2.indexOf("cot 9") !== -1) {
            ipIdx2 = h2;
            break;
          }
        }

        var allRows2 = sheet2.getRange(2, 1, lastRow2 - 1, lastCol2).getValues();
        for (var r2 = 0; r2 < allRows2.length; r2++) {
          var rowData = allRows2[r2];
          var studentName = String(rowData[1] || "").trim();
          if (!studentName) continue;

          var rawIp = "";
          if (rowData[8] !== undefined && rowData[8] !== null && String(rowData[8]).trim() !== "") {
            rawIp = String(rowData[8]).trim();
          } else if (rowData[ipIdx2] !== undefined && rowData[ipIdx2] !== null) {
            rawIp = String(rowData[ipIdx2]).trim();
          }

          submissions.push({
            stt: rowData[0],
            studentName: studentName,
            className: String(rowData[2] || "").trim(),
            totalScore: Number(rowData[3]) || 0,
            scoreString: String(rowData[4] || ""),
            startTime: String(rowData[5] || ""),
            endTime: String(rowData[6] || ""),
            totalDuration: String(rowData[7] || ""),
            ipAddress: rawIp
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: submissions.length,
        data: submissions
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (err2) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: err2.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // TRƯỜNG HỢP B (MẶC ĐỊNH): LẤY ĐỀ THI & THÔNG TIN CẤU HÌNH TỪ SHEET DATA1
  try {
    var sheet1 = ss.getSheetByName("data1") || ss.getActiveSheet();

    // 1. Đọc cấu hình ở Dòng 1
    var examName = sheet1.getRange("A1").getValue() || "KIỂM TRA THƯỜNG XUYÊN";
    var subject = sheet1.getRange("B1").getValue() || "TIN HỌC 6";
    var schoolName = sheet1.getRange("C1").getValue() || "TRƯỜNG THCS VÕ VĂN KIỆT";
    var durationVal = sheet1.getRange("D1").getValue();
    var durationMinutes = 15;
    if (typeof durationVal === "number" && durationVal > 0) {
      durationMinutes = durationVal;
    } else if (typeof durationVal === "string") {
      var dMatch = durationVal.match(/\\d+/);
      if (dMatch) durationMinutes = parseInt(dMatch[0], 10);
    }

    var examConfig = {
      schoolName: String(schoolName).trim(),
      examName: String(examName).trim(),
      subject: String(subject).trim(),
      durationMinutes: durationMinutes,
      copyrightText: "Lê Hoà Hiệp - 0983.676.470"
    };

    // 2. Đọc danh sách câu hỏi từ Dòng 5 trở đi
    var lastRow1 = sheet1.getLastRow();
    var questionsList = [];

    if (lastRow1 >= 5) {
      var rawQs = sheet1.getRange(5, 1, lastRow1 - 4, 9).getValues();
      for (var qIdx = 0; qIdx < rawQs.length; qIdx++) {
        var qRow = rawQs[qIdx];
        var contentText = String(qRow[2] || "").trim();
        if (!contentText) continue;

        var typeStr = String(qRow[0] || "").toLowerCase();
        var isEssay = typeStr.indexOf("tự luận") !== -1 || typeStr.indexOf("tu luan") !== -1;

        questionsList.push({
          id: qIdx + 1,
          orderNumber: qRow[1] || (qIdx + 1),
          type: isEssay ? "Tự luận" : "Trắc nghiệm 1 đáp án",
          content: contentText,
          optionA: String(qRow[3] || "").trim(),
          optionB: String(qRow[4] || "").trim(),
          optionC: String(qRow[5] || "").trim(),
          optionD: String(qRow[6] || "").trim(),
          correctAnswer: (qRow[7] !== undefined && qRow[7] !== null) ? String(qRow[7]).trim() : "",
          points: parseFloat(qRow[8]) || 1.0,
          category: isEssay ? "Tự luận & Tính toán" : "Trắc nghiệm cơ bản"
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      config: examConfig,
      questions: questionsList
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err1) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err1.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================
// 4. XỬ LÝ YÊU CẦU LƯU DỮ LIỆU (POST): NỘP BÀI, CHẤM ĐIỂM HOẶC LƯU ĐỀ THI
// =========================================================================
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (lockErr) {}

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = {};
      }
    }

    if (e && e.parameter) {
      for (var pKey in e.parameter) {
        if (data[pKey] === undefined || data[pKey] === null || data[pKey] === "") {
          data[pKey] = e.parameter[pKey];
        }
      }
    }

    // -----------------------------------------------------------------------
    // NHÁNH 1: LƯU / CHỈNH SỬA ĐỀ THI & CẤU HÌNH VÀO SHEET DATA1
    // -----------------------------------------------------------------------
    if (data.action === "saveExam" || (data.questions && Array.isArray(data.questions))) {
      var sheet1 = ss.getSheetByName("data1") || ss.getActiveSheet();

      // Cập nhật cấu hình Dòng 1
      if (data.config) {
        if (data.config.examName !== undefined) sheet1.getRange("A1").setValue(data.config.examName);
        if (data.config.subject !== undefined) sheet1.getRange("B1").setValue(data.config.subject);
        if (data.config.schoolName !== undefined) sheet1.getRange("C1").setValue(data.config.schoolName);
        if (data.config.durationMinutes !== undefined) sheet1.getRange("D1").setValue(Number(data.config.durationMinutes) || 15);
      }

      // Cập nhật danh sách câu hỏi từ Dòng 5 trở đi
      if (data.questions && Array.isArray(data.questions)) {
        if (!sheet1.getRange("A4").getValue()) {
          var hRange1 = sheet1.getRange("A4:I4");
          hRange1.setValues([["Loại", "Câu số", "Nội dung câu hỏi", "Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D", "Đáp án đúng", "Điểm"]]);
          hRange1.setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");
        }

        var curLastRow1 = sheet1.getLastRow();
        if (curLastRow1 >= 5) {
          sheet1.getRange(5, 1, curLastRow1 - 4, 9).clearContent();
        }

        if (data.questions.length > 0) {
          var questionRows = [];
          for (var qI = 0; qI < data.questions.length; qI++) {
            var qItem = data.questions[qI];
            questionRows.push([
              qItem.type || "Trắc nghiệm 1 đáp án",
              qItem.orderNumber || (qI + 1),
              qItem.content || "",
              qItem.optionA || "",
              qItem.optionB || "",
              qItem.optionC || "",
              qItem.optionD || "",
              qItem.correctAnswer || "",
              Number(qItem.points) || 1.0
            ]);
          }
          sheet1.getRange(5, 1, questionRows.length, 9).setValues(questionRows);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Đã lưu thành công cấu hình và đề thi vào sheet data1!",
        totalQuestions: (data.questions && data.questions.length) || 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // -----------------------------------------------------------------------
    // NHÁNH 2: LƯU KẾT QUẢ NỘP BÀI HOẶC CẬP NHẬT ĐIỂM SỐ VÀO SHEET DATA2
    // -----------------------------------------------------------------------
    var sheet2 = ss.getSheetByName("data2") || ss.getActiveSheet();

    var isUpdate = (
      data.action === "update" ||
      data.action === "edit" ||
      data.action === "regrade" ||
      data.isUpdate === true ||
      String(data.isUpdate) === "true" ||
      (e && e.parameter && (e.parameter.action === "update" || e.parameter.isUpdate === "true"))
    );

    var studentName = String(data.studentName || data.name || "Học sinh").trim();
    var className = String(data.className || data.class || "").trim();
    var totalScore = data.totalScore !== undefined ? Number(data.totalScore) : 0;
    var scoreString = String(data.scoreString || data.detailedScores || "");
    var startTime = String(data.startTime || "");
    var endTime = String(data.endTime || "");
    var totalDuration = String(data.totalDuration || "");
    var clientIp = String(data.ip || data.ipAddress || data.clientIp || data.ipHocSinh || "");

    var lastRow2 = sheet2.getLastRow();
    var lastCol2 = Math.max(sheet2.getLastColumn(), 9);

    // 1. Nhận diện các cột tiêu chuẩn từ Dòng 1
    var headers2 = lastRow2 >= 1 ? (sheet2.getRange(1, 1, 1, lastCol2).getValues()[0] || []) : [];
    var sttColIdx = 0;    // Mặc định Cột A (0)
    var nameColIdx = 1;   // Mặc định Cột B (1)
    var classColIdx = 2;  // Mặc định Cột C (2)
    var scoreColIdx = 3;  // Mặc định Cột D (3)
    var detailColIdx = 4; // Mặc định Cột E (4)
    var ipColIdx = 8;     // Mặc định Cột I (8)

    for (var h = 0; h < headers2.length; h++) {
      var hText = removeAccents(String(headers2[h] || ""));
      if (hText.indexOf("stt") !== -1 || hText === "so thu tu") sttColIdx = h;
      else if (hText.indexOf("ten") !== -1 || hText.indexOf("ho ten") !== -1 || hText.indexOf("hoc sinh") !== -1) nameColIdx = h;
      else if (hText.indexOf("lop") !== -1 || hText.indexOf("class") !== -1) classColIdx = h;
      else if (hText.indexOf("tong diem") !== -1 || hText === "diem" || hText.indexOf("score") !== -1) scoreColIdx = h;
      else if (hText.indexOf("diem tung cau") !== -1 || hText.indexOf("chi tiet") !== -1) detailColIdx = h;
      else if (hText.indexOf("ip") !== -1 || hText.indexOf("cot 9") !== -1) ipColIdx = h;
    }

    // 2. Nhận diện các cột từng câu hỏi trong datasheet (VD: "Câu 1", "Câu 2", "C1", "C2", "Q1",...)
    var questionCols = {};
    for (var qCol = 0; qCol < headers2.length; qCol++) {
      var rawHead = String(headers2[qCol] || "").trim();
      var cleanHead = removeAccents(rawHead).toLowerCase();
      if (qCol === sttColIdx || qCol === nameColIdx || qCol === classColIdx || qCol === scoreColIdx || qCol === ipColIdx) {
        continue;
      }
      var qMatch = cleanHead.match(/^(?:cau|c|q)\\s*(\\d+)$/i);
      if (qMatch) {
        questionCols[parseInt(qMatch[1], 10)] = qCol;
      } else if (/^\\d+$/.test(cleanHead) && qCol >= 3) {
        questionCols[parseInt(cleanHead, 10)] = qCol;
      }
    }

    var targetRow = -1;

    // 3. Tìm dòng của học sinh nếu bảng đã có dữ liệu
    if (lastRow2 >= 2) {
      var allRows = sheet2.getRange(2, 1, lastRow2 - 1, lastCol2).getValues();
      var cleanTargetName = removeAccents(studentName);
      var cleanTargetClass = removeAccents(className);
      var rawTargetName = cleanTargetName.replace(/\\s+/g, "");
      var rawTargetClass = cleanTargetClass.replace(/\\s+/g, "");

      // Ưu tiên 1: Khớp chuẩn Họ tên + Lớp
      if (rawTargetName) {
        for (var rIdx = allRows.length - 1; rIdx >= 0; rIdx--) {
          var rName = removeAccents(String(allRows[rIdx][nameColIdx] || ""));
          var rClass = removeAccents(String(allRows[rIdx][classColIdx] || ""));
          var rRawName = rName.replace(/\\s+/g, "");
          var rRawClass = rClass.replace(/\\s+/g, "");

          var nameMatches = (rName === cleanTargetName) || (rRawName === rawTargetName) || (rRawName && rawTargetName && (rRawName.indexOf(rawTargetName) !== -1 || rawTargetName.indexOf(rRawName) !== -1));
          var classMatches = !rawTargetClass || !rRawClass || (rRawClass === rawTargetClass);

          if (nameMatches && classMatches) {
            targetRow = rIdx + 2;
            break;
          }
        }
      }

      // Ưu tiên 2: Khớp theo STT nếu chưa tìm thấy bằng Họ tên
      if (targetRow === -1 && data.stt !== undefined && data.stt !== null && String(data.stt).trim() !== "") {
        var targetSTT = parseInt(data.stt, 10);
        if (!isNaN(targetSTT) && targetSTT > 0) {
          for (var r2Idx = 0; r2Idx < allRows.length; r2Idx++) {
            var valSTT = parseInt(allRows[r2Idx][sttColIdx], 10);
            if (valSTT === targetSTT) {
              targetRow = r2Idx + 2;
              break;
            }
          }
        }
      }
    }

    // 4. NẾU LÀ LỆNH SỬA ĐIỂM (isUpdate) HOẶC ĐÃ CÓ HỌC SINH TRONG BẢNG:
    // Ghi đè trực tiếp điểm vào ô, KHÔNG tạo thêm dòng mới!
    if (isUpdate || targetRow >= 2) {
      if (targetRow === -1) {
        targetRow = lastRow2 >= 2 ? lastRow2 : 2;
      }

      // A. Cập nhật Tổng điểm vào cột Tổng điểm
      if (scoreColIdx !== -1) {
        sheet2.getRange(targetRow, scoreColIdx + 1).setValue(totalScore);
      }

      // B. Cập nhật chuỗi Điểm từng câu vào cột Chi tiết
      if (detailColIdx !== -1 && scoreString) {
        sheet2.getRange(targetRow, detailColIdx + 1).setValue(scoreString);
      }

      // C. CẬP NHẬT ĐIỂM MỚI CỦA CÂU ĐÓ VÀO ĐÚNG CỘT CÂU TƯƠNG ỨNG TRÊN DATASHEET
      var targetOrderNum = data.targetOrderNumber !== undefined ? parseInt(data.targetOrderNumber, 10) : (e && e.parameter && e.parameter.targetOrderNumber ? parseInt(e.parameter.targetOrderNumber, 10) : -1);
      var targetQScore = data.questionScore !== undefined ? Number(data.questionScore) : (e && e.parameter && e.parameter.questionScore !== undefined ? Number(e.parameter.questionScore) : null);

      if (targetOrderNum !== -1 && targetQScore !== null) {
        if (questionCols[targetOrderNum] !== undefined) {
          sheet2.getRange(targetRow, questionCols[targetOrderNum] + 1).setValue(targetQScore);
        }
      }

      // D. Cập nhật toàn bộ các câu nếu có danh sách questionScores
      var qScores = data.questionScores;
      if (qScores && typeof qScores === "object") {
        for (var qK in qScores) {
          var qN = parseInt(qK, 10);
          if (!isNaN(qN) && questionCols[qN] !== undefined) {
            sheet2.getRange(targetRow, questionCols[qN] + 1).setValue(qScores[qK]);
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "updated",
        message: "Đã cập nhật điểm vào datasheet tại dòng " + targetRow + " thành công!",
        row: targetRow,
        studentName: studentName,
        totalScore: totalScore,
        targetOrderNumber: targetOrderNum,
        questionScore: targetQScore
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. NẾU LÀ BÀI NỘP MỚI LẦN ĐẦU (Thêm dòng mới vào sheet data2):
    var nextRow = Math.max(lastRow2 + 1, 2);
    var nextSTT = 1;
    if (lastRow2 >= 2) {
      var prevSTT = parseInt(sheet2.getRange(lastRow2, sttColIdx + 1).getValue(), 10);
      nextSTT = isNaN(prevSTT) ? lastRow2 : prevSTT + 1;
    }

    var newRowData = new Array(Math.max(lastCol2, 9));
    for (var k = 0; k < newRowData.length; k++) newRowData[k] = "";
    newRowData[sttColIdx] = nextSTT;
    newRowData[nameColIdx] = studentName;
    newRowData[classColIdx] = className;
    newRowData[scoreColIdx] = totalScore;
    newRowData[detailColIdx] = scoreString;
    newRowData[5] = startTime;
    newRowData[6] = endTime;
    newRowData[7] = totalDuration;
    newRowData[ipColIdx] = clientIp;

    // Điền điểm từng câu vào các cột câu tương ứng nếu datasheet có cột câu
    if (data.questionScores && typeof data.questionScores === "object") {
      for (var qKey2 in data.questionScores) {
        var qN2 = parseInt(qKey2, 10);
        if (!isNaN(qN2) && questionCols[qN2] !== undefined && questionCols[qN2] < newRowData.length) {
          newRowData[questionCols[qN2]] = data.questionScores[qKey2];
        }
      }
    }

    sheet2.getRange(nextRow, 1, 1, newRowData.length).setValues([newRowData]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: "inserted",
      stt: nextSTT,
      row: nextRow,
      studentName: studentName,
      totalScore: totalScore,
      clientIp: clientIp
    })).setMimeType(ContentService.MimeType.JSON);

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
